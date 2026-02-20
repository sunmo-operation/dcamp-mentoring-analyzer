"use client";

import { useState, useCallback, useEffect, useRef } from "react";
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
import { IndustryContext } from "./sections/industry-context";
import type { CompanyBriefing } from "@/types";

interface BriefingPanelProps {
  companyId: string;
  companyName: string;
  initialBriefing?: CompanyBriefing;
  isStale: boolean;
  staleReason?: string;
}

// 진행 단계별 표시 설명
const STEP_DESCRIPTIONS: Record<number, string> = {
  1: "데이터 수집",
  2: "AI 분석 준비",
  3: "AI 분석",
  4: "결과 정리",
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
  const [progress, setProgress] = useState<string>("");
  const [step, setStep] = useState<number>(0);
  const [detail, setDetail] = useState<string>("");
  const [elapsed, setElapsed] = useState<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 로딩 중 경과 시간 자동 카운트
  useEffect(() => {
    if (loading) {
      const start = Date.now();
      timerRef.current = setInterval(() => {
        setElapsed(Math.round((Date.now() - start) / 1000));
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setElapsed(0);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [loading]);

  // SSE 스트리밍으로 브리핑 생성
  const generateBriefing = useCallback(
    async (force: boolean = false) => {
      setLoading(true);
      setError(null);
      setProgress("연결 중...");
      setStep(0);
      setDetail("");

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

              // heartbeat는 연결 유지용이므로 무시
              if (data.type === "heartbeat") continue;

              if (data.type === "status" || data.type === "progress") {
                setProgress(data.message);
                if (data.step) setStep(data.step);
                if (data.detail) setDetail(data.detail);
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
        setError("서버에 연결할 수 없습니다. 다시 시도해주세요.");
      } finally {
        setLoading(false);
        setProgress("");
        setStep(0);
        setDetail("");
      }
    },
    [companyId]
  );

  // ── 첫 생성 로딩 (스트리밍 진행 상황 표시) ────────
  if (loading && !briefing) {
    // 경과 시간 포맷 (0:00)
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    const elapsedStr = `${mins}:${secs.toString().padStart(2, "0")}`;

    return (
      <div className="space-y-4">
        <h2 className="text-lg font-bold">AI 컨텍스트 브리핑</h2>
        <div className="rounded-lg border border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/50 p-6">
          <div className="flex flex-col items-center gap-4">
            {/* 스피너 + 경과 시간 */}
            <div className="relative">
              <svg className="h-12 w-12 animate-spin text-blue-500" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-mono text-blue-600 dark:text-blue-400">
                {elapsedStr}
              </span>
            </div>

            <p className="text-sm font-medium text-blue-800 dark:text-blue-200" role="status">
              {companyName} 브리핑 생성 중
            </p>

            {/* 단계별 진행 표시 */}
            {step > 0 && (
              <div className="w-full max-w-sm space-y-2">
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map((s) => (
                    <div key={s} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className={`h-1.5 w-full rounded-full transition-all duration-500 ${
                          s < step ? "bg-blue-500" :
                          s === step ? "bg-blue-400 animate-pulse" :
                          "bg-blue-200 dark:bg-blue-800"
                        }`}
                      />
                      <span className={`text-[9px] ${
                        s <= step ? "text-blue-600 dark:text-blue-400 font-medium" : "text-blue-300 dark:text-blue-700"
                      }`}>
                        {STEP_DESCRIPTIONS[s]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 현재 상태 메시지 */}
            <p className="text-xs text-blue-600 dark:text-blue-400 text-center">
              {progress || "준비 중..."}
            </p>

            {/* 분석 데이터 규모 */}
            {detail && (
              <p className="text-[10px] text-blue-400 dark:text-blue-500">
                {detail}
              </p>
            )}

            {/* 오래 걸릴 때 안내 */}
            {elapsed > 15 && (
              <p className="text-[10px] text-blue-400/70 dark:text-blue-500/70 text-center">
                데이터가 많을수록 분석이 더 정확해집니다. 잠시만 기다려주세요.
              </p>
            )}
          </div>
        </div>

        {/* 스켈레톤 */}
        <div className="animate-pulse space-y-3">
          <div className="h-20 rounded-lg bg-muted" />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="h-16 rounded-lg bg-muted" />
            <div className="h-16 rounded-lg bg-muted" />
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
    industryContext,
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

        {/* ① Executive Summary */}
        {executiveSummary && (
          <ExecutiveSummary
            oneLiner={executiveSummary.oneLiner}
            currentPhase={executiveSummary.currentPhase}
            momentum={executiveSummary.momentum}
            momentumReason={executiveSummary.momentumReason}
            keyNumbers={keyNumbers}
            pmfStage={executiveSummary.pmfStage}
            vocStrength={executiveSummary.vocStrength}
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

        {/* ⑨ 업계 동향 & 경쟁 환경 */}
        {industryContext && (
          <IndustryContext
            competitors={industryContext.competitors}
            industryTrends={industryContext.industryTrends}
            regulatoryAndPolicy={industryContext.regulatoryAndPolicy}
            marketInsight={industryContext.marketInsight}
          />
        )}

      {/* ── 갱신 중 오버레이 닫기 ─────────────────── */}
      </div>
    </div>
  );
}
