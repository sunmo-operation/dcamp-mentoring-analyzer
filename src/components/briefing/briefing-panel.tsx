"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { StaleIndicator } from "./stale-indicator";
import { RefreshBar } from "./refresh-bar";
import { parseBulletLines } from "./briefing-styles";
import { ExecutiveSummary } from "./sections/executive-summary";
import { OkrDiagnosis } from "./sections/okr-diagnosis";
import { RepeatPatterns } from "./sections/repeat-patterns";
import { UnspokenSignals } from "./sections/unspoken-signals";
import { MentorInsights } from "./sections/mentor-insights";
import { ResourceDiagnosis } from "./sections/resource-diagnosis";
import { MeetingStrategy } from "./sections/meeting-strategy";
import { PmActions } from "./sections/pm-actions";
import type { CompanyBriefing } from "@/types";

interface BriefingPanelProps {
  companyId: string;
  companyName: string;
  initialBriefing?: CompanyBriefing;
  isStale: boolean;
  staleReason?: string;
}

// 진행 단계별 표시 메시지
const STEP_LABELS: Record<number, string> = {
  1: "Notion에서 데이터를 수집하고 있습니다...",
  2: "AI가 브리핑을 생성하고 있습니다...",
  3: "AI 분석 중...",
  4: "결과를 정리하고 있습니다...",
};

export function BriefingPanel({
  companyId,
  companyName,
  initialBriefing,
  isStale,
  staleReason,
}: BriefingPanelProps) {
  const [briefing, setBriefing] = useState<CompanyBriefing | undefined>(
    initialBriefing
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 스트리밍 진행 상황 표시용
  const [progress, setProgress] = useState<string>("");
  const [step, setStep] = useState<number>(0);

  // SSE 스트리밍으로 브리핑 생성
  const generateBriefing = useCallback(
    async (force: boolean = false) => {
      setLoading(true);
      setError(null);
      setProgress("연결 중...");
      setStep(0);

      try {
        const res = await fetch("/api/briefing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ companyId, force }),
        });

        if (!res.ok || !res.body) {
          const text = await res.text();
          try {
            const data = JSON.parse(text);
            setError(data.error || `서버 오류 (${res.status})`);
          } catch {
            setError(`서버 오류가 발생했습니다 (${res.status})`);
          }
          return;
        }

        // SSE 스트림 읽기
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === "status" || data.type === "progress") {
                setProgress(data.message);
                if (data.step) setStep(data.step);
              }
              if (data.type === "complete") {
                setBriefing(data.briefing);
              }
              if (data.type === "error") {
                setError(data.message);
              }
            } catch {
              // 파싱 실패 무시
            }
          }
        }
      } catch (err) {
        console.warn("[BriefingPanel] 브리핑 생성 실패:", err);
        setError("서버에 연결할 수 없습니다.");
      } finally {
        setLoading(false);
        setProgress("");
        setStep(0);
      }
    },
    [companyId]
  );

  // ── 첫 생성 로딩 (스트리밍 진행 상황 표시) ────────
  if (loading && !briefing) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-bold">AI 컨텍스트 브리핑</h2>
        <div className="rounded-lg border border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/50 p-6">
          <div className="flex flex-col items-center gap-3">
            <svg className="h-8 w-8 animate-spin text-blue-500" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-sm font-medium text-blue-800 dark:text-blue-200" role="status">
              {companyName}의 브리핑을 생성하고 있습니다
            </p>
            {/* 실시간 진행 상황 */}
            <p className="text-xs text-blue-600 dark:text-blue-400">
              {progress || "준비 중..."}
            </p>
            {/* 진행 바 */}
            {step > 0 && (
              <div className="w-full max-w-xs">
                <div className="flex justify-between text-[10px] text-blue-400 mb-1">
                  <span>단계 {step}/4</span>
                </div>
                <div className="h-1.5 rounded-full bg-blue-200 dark:bg-blue-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-blue-500 transition-all duration-500"
                    style={{ width: `${Math.min(step * 25, 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="animate-pulse space-y-3">
          <div className="h-24 rounded-lg bg-muted" />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="h-20 rounded-lg bg-muted" />
            <div className="h-20 rounded-lg bg-muted" />
          </div>
        </div>
      </div>
    );
  }

  // ── 에러 상태 ─────────────────────────────────
  if (error && !briefing) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-bold">AI 컨텍스트 브리핑</h2>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => generateBriefing(true)}
          >
            다시 시도
          </Button>
        </div>
      </div>
    );
  }

  // ── 브리핑 미존재 ─────────────────────────────
  if (!briefing) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-bold">AI 컨텍스트 브리핑</h2>
        <StaleIndicator
          isStale={false}
          hasBriefing={false}
          onRefresh={() => generateBriefing(true)}
          isLoading={loading}
        />
      </div>
    );
  }

  const {
    executiveSummary,
    okrDiagnosis,
    repeatPatterns,
    unspokenSignals,
    mentorInsights,
    meetingStrategy,
    pmActions,
  } = briefing;

  // 개조식 파싱
  const keyNumbers = parseBulletLines(executiveSummary?.reportBody);
  const repeatedAdviceLines = parseBulletLines(mentorInsights?.repeatedAdvice);
  const ignoredAdviceLines = parseBulletLines(mentorInsights?.ignoredAdvice);
  const dcampCanDoLines = parseBulletLines(mentorInsights?.gapAnalysis);

  // 리소스 진단 파싱
  const resourceLines = (mentorInsights?.currentExpertRequests || "").split("\n").filter(Boolean);
  const primaryNeed = resourceLines[0] || "";
  const resourceReasoning = resourceLines.slice(1).join(" ");

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold">AI 컨텍스트 브리핑</h2>

      {/* ── 갱신 컨트롤 (항상 상단) ──────────────── */}
      <RefreshBar
        loading={loading}
        briefing={true}
        isStale={isStale}
        staleReason={staleReason}
        onRefresh={generateBriefing}
        createdAt={briefing.createdAt}
      />

      {/* ── 갱신 중 오버레이 ────────────────────── */}
      <div className={`space-y-6 transition-opacity duration-300 ${loading ? "opacity-50 pointer-events-none" : "opacity-100"}`} aria-busy={loading}>

        {/* ① 경영진 요약 */}
        {executiveSummary && (
          <ExecutiveSummary
            oneLiner={executiveSummary.oneLiner}
            currentPhase={executiveSummary.currentPhase}
            momentum={executiveSummary.momentum}
            momentumReason={executiveSummary.momentumReason}
            keyNumbers={keyNumbers}
          />
        )}

        {/* ② OKR 진단 */}
        {okrDiagnosis && (
          <OkrDiagnosis
            overallRate={okrDiagnosis.overallRate}
            objectives={okrDiagnosis.objectives}
            trendAnalysis={okrDiagnosis.trendAnalysis}
            metricVsNarrative={okrDiagnosis.metricVsNarrative}
          />
        )}

        {/* ③ 심층 인사이트 */}
        {repeatPatterns && repeatPatterns.length > 0 && (
          <RepeatPatterns patterns={repeatPatterns} />
        )}

        {/* ④ 말하지 않은 신호 */}
        {unspokenSignals && unspokenSignals.length > 0 && (
          <UnspokenSignals signals={unspokenSignals} />
        )}

        {/* ⑤ 멘토 인사이트 */}
        {mentorInsights && (
          <MentorInsights
            repeatedAdviceLines={repeatedAdviceLines}
            ignoredAdviceLines={ignoredAdviceLines}
            executedAdvice={mentorInsights.executedAdvice}
          />
        )}

        {/* ⑥ 리소스 진단 */}
        {mentorInsights && (primaryNeed || dcampCanDoLines.length > 0) && (
          <ResourceDiagnosis
            primaryNeed={primaryNeed}
            resourceReasoning={resourceReasoning}
            dcampCanDoLines={dcampCanDoLines}
          />
        )}

        {/* ⑦ 미팅 전략 */}
        {meetingStrategy && (
          <MeetingStrategy
            focus={meetingStrategy.focus}
            keyQuestions={meetingStrategy.keyQuestions}
            openingLine={meetingStrategy.openingLine}
            avoid={meetingStrategy.avoid}
          />
        )}

        {/* ⑧ PM 액션 */}
        {pmActions && pmActions.length > 0 && (
          <PmActions actions={pmActions} />
        )}

      {/* ── 갱신 중 오버레이 닫기 ─────────────────── */}
      </div>
    </div>
  );
}
