"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
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
import { sanitizeForReact } from "@/lib/safe-render";
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
  const [pct, setPct] = useState<number>(0);
  // 토스 스타일 메시지 인덱스
  const [funMsgIdx, setFunMsgIdx] = useState<number>(0);
  const msgTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 로딩 중 메시지 순환 (3초마다)
  useEffect(() => {
    if (loading) {
      setFunMsgIdx(0);
      msgTimerRef.current = setInterval(() => {
        setFunMsgIdx((prev) => (prev + 1) % FUN_MESSAGES.length);
      }, 3000);
    } else {
      if (msgTimerRef.current) clearInterval(msgTimerRef.current);
      setFunMsgIdx(0);
    }
    return () => {
      if (msgTimerRef.current) clearInterval(msgTimerRef.current);
    };
  }, [loading]);

  // SSE 스트리밍으로 브리핑 생성
  const abortRef = useRef<AbortController | null>(null);

  const generateBriefing = useCallback(
    async (force: boolean = false) => {
      // 이전 요청이 있으면 취소
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      setError(null);
      setProgress("연결 중...");
      setStep(0);
      setDetail("");
      setPct(0);

      try {
        const res = await fetch("/api/briefing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ companyId, force }),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          const text = await res.text().catch(() => "");
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

        try {
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
                  if (data.step) {
                    setStep(data.step);
                    // step 기반 퍼센트 매핑
                    if (data.step === 1) setPct(15);
                    else if (data.step === 3) setPct(95);
                  }
                  if (data.detail) setDetail(data.detail);
                  // SSE progress 이벤트의 pct 값 반영 (step2 AI 생성 진행률)
                  if (data.type === "progress" && typeof data.pct === "number") {
                    // step2 pct(0~90)를 전체 20~90으로 리매핑
                    const mapped = 20 + Math.round(data.pct * 0.78);
                    setPct(mapped);
                  }
                }
                if (data.type === "complete") {
                  // SSE로 받은 브리핑 데이터를 sanitize — React #310 방지
                  setBriefing(sanitizeForReact(data.briefing as CompanyBriefing));
                  receivedComplete = true;
                }
                if (data.type === "error") {
                  setError(data.message);
                  receivedError = true;
                }
              } catch {
                // SSE 메시지 파싱 실패 무시
              }
            }
          }
        } catch (streamErr) {
          // 스트림 읽기 도중 네트워크 에러 (Vercel 타임아웃 등)
          if (!receivedComplete && !receivedError) {
            console.warn("[BriefingPanel] 스트림 읽기 중단:", streamErr);
            setError("서버 연결이 끊어졌습니다. 브리핑 생성에 시간이 오래 걸릴 수 있습니다. 다시 시도해주세요.");
            return;
          }
        }

        // 스트림이 complete/error 없이 끊긴 경우 (Vercel 타임아웃 등)
        if (!receivedComplete && !receivedError) {
          setError("브리핑 생성이 중단되었습니다. 서버 시간 초과일 수 있습니다. 다시 시도해주세요.");
        }
      } catch (err) {
        // AbortController에 의한 취소는 에러로 표시하지 않음
        if (err instanceof DOMException && err.name === "AbortError") return;
        console.warn("[BriefingPanel] 브리핑 생성 실패:", err);
        setError("서버에 연결할 수 없습니다. 다시 시도해주세요.");
      } finally {
        setLoading(false);
        setProgress("");
        setStep(0);
        setDetail("");
        setPct(0);
      }
    },
    [companyId]
  );

  // 컴포넌트 언마운트 시 진행 중인 요청 취소
  useEffect(() => {
    return () => { abortRef.current?.abort(); };
  }, []);

  // ── 브리핑 데이터 파싱 (훅은 조건부 return 위에 위치해야 함!) ──
  // React의 Rules of Hooks: 훅 개수가 렌더 간 변하면 에러 #310 발생
  const executiveSummary = briefing?.executiveSummary;
  const okrDiagnosis = briefing?.okrDiagnosis;
  const repeatPatterns = briefing?.repeatPatterns;
  const unspokenSignals = briefing?.unspokenSignals;
  const mentorInsights = briefing?.mentorInsights;
  const meetingStrategy = briefing?.meetingStrategy;
  const pmActions = briefing?.pmActions;

  const safeReportBody = typeof executiveSummary?.reportBody === "string" ? executiveSummary.reportBody : "";
  const safeRepeatedAdvice = typeof mentorInsights?.repeatedAdvice === "string" ? mentorInsights.repeatedAdvice : "";
  const safeIgnoredAdvice = typeof mentorInsights?.ignoredAdvice === "string" ? mentorInsights.ignoredAdvice : "";
  const safeGapAnalysis = typeof mentorInsights?.gapAnalysis === "string" ? mentorInsights.gapAnalysis : "";
  const safeExpertRequests = typeof mentorInsights?.currentExpertRequests === "string" ? mentorInsights.currentExpertRequests : "";

  const keyNumbers = useMemo(() => parseBulletLines(safeReportBody), [safeReportBody]);
  const repeatedAdviceLines = useMemo(() => parseBulletLines(safeRepeatedAdvice), [safeRepeatedAdvice]);
  const ignoredAdviceLines = useMemo(() => parseBulletLines(safeIgnoredAdvice), [safeIgnoredAdvice]);
  const dcampCanDoLines = useMemo(() => parseBulletLines(safeGapAnalysis), [safeGapAnalysis]);
  const { primaryNeed, resourceReasoning } = useMemo(() => {
    const lines = safeExpertRequests.split("\n").filter(Boolean);
    return { primaryNeed: lines[0] || "", resourceReasoning: lines.slice(1).join(" ") };
  }, [safeExpertRequests]);

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

            {/* 프로그레스 바 */}
            <div className="w-full max-w-xs space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-blue-500 transition-all duration-700 ease-out"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 tabular-nums w-9 text-right">
                  {pct}%
                </span>
              </div>
              {/* 단계별 설명 또는 데이터 볼륨 메시지 */}
              {(detail || progress) && (
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center truncate">
                  {detail || progress}
                </p>
              )}
            </div>
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
        <div className="rounded-2xl border-0 bg-destructive/5 p-5 dark:bg-red-950">
          <p className="text-sm font-medium text-destructive dark:text-red-200">{error}</p>
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
