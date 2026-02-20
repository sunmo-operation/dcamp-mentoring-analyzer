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
// industryContext 섹션 제거 — 노션 데이터 기반 핵심 브리핑에 집중
import type { CompanyBriefing } from "@/types";

interface BriefingPanelProps {
  companyId: string;
  companyName: string;
  initialBriefing?: CompanyBriefing;
  isStale: boolean;
  staleReason?: string;
}

// 토스 스타일 로딩 메시지 (3초마다 순환)
const FUN_MESSAGES = [
  "Notion에서 데이터를 가져오고 있어요",
  "회의록을 꼼꼼히 읽는 중이에요",
  "멘토링 히스토리를 분석하고 있어요",
  "최고의 AI 엔진이 열심히 일하는 중이에요",
  "KPT 회고에서 진짜 이슈를 찾고 있어요",
  "숨겨진 인사이트를 발굴하는 중이에요",
  "경쟁사와 시장 트렌드를 조사하고 있어요",
  "데이터 간 연결고리를 찾고 있어요",
  "PM을 위한 맞춤 전략을 정리하고 있어요",
  "말과 행동의 갭을 분석하고 있어요",
  "최고의 브리핑을 만들고 있어요",
  "거의 다 됐어요, 조금만 기다려주세요",
];

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
  // 토스 스타일 메시지 인덱스
  const [funMsgIdx, setFunMsgIdx] = useState<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const msgTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 로딩 중 경과 시간 자동 카운트
  useEffect(() => {
    if (loading) {
      const start = Date.now();
      timerRef.current = setInterval(() => {
        setElapsed(Math.round((Date.now() - start) / 1000));
      }, 1000);
      // 3초마다 재미있는 메시지 순환
      setFunMsgIdx(0);
      msgTimerRef.current = setInterval(() => {
        setFunMsgIdx((prev) => (prev + 1) % FUN_MESSAGES.length);
      }, 3000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      if (msgTimerRef.current) clearInterval(msgTimerRef.current);
      setElapsed(0);
      setFunMsgIdx(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (msgTimerRef.current) clearInterval(msgTimerRef.current);
    };
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
        let receivedComplete = false;
        let receivedError = false;

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
                receivedComplete = true;
              }
              if (data.type === "error") {
                setError(data.message);
                receivedError = true;
              }
            } catch {
              // 파싱 실패 무시
            }
          }
        }

        // 스트림이 complete/error 없이 끊긴 경우 (Vercel 타임아웃 등)
        if (!receivedComplete && !receivedError) {
          setError("브리핑 생성이 중단되었습니다. 서버 시간 초과일 수 있습니다. 다시 시도해주세요.");
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

  // ── 첫 생성 로딩 (토스 스타일 로딩 UX) ────────
  if (loading && !briefing) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-bold">AI 컨텍스트 브리핑</h2>
        <div className="rounded-2xl border border-blue-100 bg-gradient-to-b from-blue-50 to-white dark:border-blue-900 dark:from-blue-950/60 dark:to-gray-950 p-8">
          <div className="flex flex-col items-center gap-5">

            {/* 부드러운 펄스 아이콘 */}
            <div className="relative flex items-center justify-center">
              <div className="absolute h-16 w-16 rounded-full bg-blue-400/20 animate-ping" />
              <div className="relative h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/25">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
            </div>

            {/* 회사명 + 메인 타이틀 */}
            <div className="text-center">
              <p className="text-base font-semibold text-gray-900 dark:text-gray-100" role="status">
                {companyName}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                브리핑을 준비하고 있어요
              </p>
            </div>

            {/* 토스 스타일: 순환하는 재미있는 메시지 */}
            <div className="h-5 flex items-center">
              <p
                className="text-sm text-blue-600 dark:text-blue-400 text-center transition-opacity duration-500"
                key={funMsgIdx}
                style={{ animation: "fadeInUp 0.5s ease-out" }}
              >
                {FUN_MESSAGES[funMsgIdx]}
              </p>
            </div>

            {/* 심플한 3단계 진행바 */}
            {step > 0 && (
              <div className="w-full max-w-xs">
                <div className="flex gap-1.5">
                  {[1, 2, 3].map((s) => (
                    <div
                      key={s}
                      className={`h-1 flex-1 rounded-full transition-all duration-700 ${
                        s < step ? "bg-blue-500" :
                        s === step ? "bg-blue-400 animate-pulse" :
                        "bg-gray-200 dark:bg-gray-700"
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* 경과 시간 (작게) */}
            <p className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">
              {elapsed}초 경과
            </p>
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

        {/* 업계 동향 섹션 제거 — 노션 데이터 기반 핵심 브리핑에 집중 */}

      {/* ── 갱신 중 오버레이 닫기 ─────────────────── */}
      </div>
    </div>
  );
}
