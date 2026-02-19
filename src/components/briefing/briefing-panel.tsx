"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { StaleIndicator } from "./stale-indicator";
import type { CompanyBriefing } from "@/types";

interface BriefingPanelProps {
  companyId: string;
  companyName: string;
  initialBriefing?: CompanyBriefing;
  isStale: boolean;
  staleReason?: string;
}

// ── 모멘텀 뱃지 스타일 ────────────────────────────
const momentumStyle: Record<string, { bg: string; label: string }> = {
  positive: { bg: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200", label: "상승세" },
  neutral: { bg: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200", label: "보합" },
  negative: { bg: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200", label: "하락세" },
  critical: { bg: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200", label: "위기" },
};

// ── 인사이트 카테고리 색상 ────────────────────────────
const categoryStyle: Record<string, string> = {
  "전략": "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  "조직": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  "실행": "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  "시장": "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  "제품": "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
  "재무": "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200",
  "멘토링": "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
};

const urgencyLabel: Record<string, string> = {
  high: "긴급",
  medium: "주의",
  low: "참고",
};

// ── 개조식 텍스트를 라인 배열로 파싱 ─────────────────
function parseBulletLines(text: string | undefined | null): string[] {
  if (!text) return [];
  return text
    .split("\n")
    .map((line) => line.replace(/^[•\-\*]\s*/, "").trim())
    .filter(Boolean);
}

// ── 복사 버튼 ────────────────────────────────────
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      onClick={handleCopy}
      className="ml-2 shrink-0 rounded px-1.5 py-0.5 text-xs text-muted-foreground hover:bg-muted transition-colors"
      title="복사"
    >
      {copied ? "복사됨" : "복사"}
    </button>
  );
}

// ── 갱신 컨트롤 바 ──────────────────────────────
function RefreshBar({
  loading,
  briefing,
  isStale,
  staleReason,
  onRefresh,
  createdAt,
}: {
  loading: boolean;
  briefing: boolean;
  isStale: boolean;
  staleReason?: string;
  onRefresh: (force: boolean) => void;
  createdAt?: string;
}) {
  if (!briefing) return null;

  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-sm font-medium text-blue-600 dark:text-blue-400 animate-pulse">
                브리핑 갱신 중...
              </span>
            </div>
          ) : isStale ? (
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-yellow-500" />
              <span className="text-sm text-yellow-700 dark:text-yellow-300">
                {staleReason || "브리핑이 최신이 아닙니다"}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-xs text-muted-foreground">
                {createdAt && `${new Date(createdAt).toLocaleString("ko-KR")} 갱신`}
              </span>
            </div>
          )}
        </div>
        <Button
          variant={isStale ? "default" : "outline"}
          size="sm"
          onClick={() => onRefresh(true)}
          disabled={loading}
          className="shrink-0"
        >
          {loading ? (
            <span className="flex items-center gap-1.5">
              <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              갱신 중
            </span>
          ) : isStale ? (
            "브리핑 갱신"
          ) : (
            "갱신"
          )}
        </Button>
      </div>
    </div>
  );
}

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

  const generateBriefing = useCallback(
    async (force: boolean = false) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/briefing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ companyId, force }),
        });
        const data = await res.json();
        if (data.success) {
          setBriefing(data.briefing);
        } else {
          setError(data.error || "브리핑 생성에 실패했습니다");
        }
      } catch {
        setError("네트워크 오류가 발생했습니다");
      } finally {
        setLoading(false);
      }
    },
    [companyId]
  );

  // ── 첫 생성 로딩 (브리핑 없이 생성 중) ────────────
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
            <p className="text-xs text-blue-600 dark:text-blue-400">
              최근 멘토링 기록을 분석 중...
            </p>
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
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-base">경영진 요약</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge className={momentumStyle[executiveSummary.momentum]?.bg || momentumStyle.neutral.bg}>
                    {momentumStyle[executiveSummary.momentum]?.label || "보합"}
                  </Badge>
                  <Badge variant="outline">{executiveSummary.currentPhase}</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-base font-semibold leading-relaxed">
                {executiveSummary.oneLiner}
              </p>
              <p className="text-xs text-muted-foreground">
                {executiveSummary.momentumReason}
              </p>
              {keyNumbers.length > 0 && (
                <ul className="rounded-lg bg-muted/50 p-3 space-y-1">
                  {keyNumbers.map((line, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <span className="shrink-0 text-primary">&#8226;</span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        )}

        {/* ② OKR 진단 — 기존 코드 유지 */}
        {okrDiagnosis && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">OKR 진단</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {okrDiagnosis.overallRate !== null && (
                <div className="flex items-center gap-4">
                  <span className="text-3xl font-bold">
                    {okrDiagnosis.overallRate}%
                  </span>
                  <div className="flex-1">
                    <div className="h-3 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${Math.min(okrDiagnosis.overallRate, 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">전체 달성율</p>
                  </div>
                </div>
              )}
              {okrDiagnosis.objectives && okrDiagnosis.objectives.length > 0 && (
                <div className="space-y-2">
                  {okrDiagnosis.objectives.map((obj, i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="truncate mr-2">{obj.name}</span>
                        <span className="shrink-0 font-medium">
                          {obj.achievementRate}%
                          {obj.achieved && (
                            <span className="ml-1 text-green-600">&#10003;</span>
                          )}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            obj.achieved
                              ? "bg-green-500"
                              : obj.achievementRate >= 70
                              ? "bg-blue-500"
                              : obj.achievementRate >= 40
                              ? "bg-yellow-500"
                              : "bg-red-500"
                          }`}
                          style={{ width: `${Math.min(obj.achievementRate, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="space-y-2">
                <p className="text-sm leading-relaxed">{okrDiagnosis.trendAnalysis}</p>
                {okrDiagnosis.metricVsNarrative && (
                  <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 dark:border-orange-800 dark:bg-orange-950">
                    <p className="text-xs font-semibold text-orange-800 dark:text-orange-200 mb-1">
                      &#9888; 지표 vs 내러티브 괴리
                    </p>
                    <p className="text-xs text-orange-700 dark:text-orange-300">
                      {okrDiagnosis.metricVsNarrative}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ③ 심층 인사이트 */}
        {repeatPatterns && repeatPatterns.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">심층 인사이트</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {repeatPatterns.map((insight, i) => (
                <div
                  key={i}
                  className="rounded-lg border p-4 space-y-2"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={categoryStyle[insight.issueCategory] || "bg-gray-100 text-gray-800"}>
                      {insight.issueCategory}
                    </Badge>
                    {insight.urgency && (
                      <Badge variant={insight.urgency === "high" ? "destructive" : "outline"} className="text-xs">
                        {urgencyLabel[insight.urgency] || insight.urgency}
                      </Badge>
                    )}
                    <span className="text-sm font-semibold">{insight.issue}</span>
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {insight.structuralCause}
                  </p>
                  <p className="text-xs text-muted-foreground/70">
                    근거: {insight.firstSeen}
                    {insight.occurrences > 1 && ` / 관련 ${insight.occurrences}건`}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* ④ 말하지 않은 신호 */}
        {unspokenSignals && unspokenSignals.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">말하지 않은 신호</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {unspokenSignals.map((signal, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-800 dark:bg-amber-950/50 space-y-1.5"
                >
                  <p className="text-sm font-medium">{signal.signal}</p>
                  <p className="text-xs text-muted-foreground">
                    {signal.detectedFrom}
                  </p>
                  <p className="text-xs font-medium text-red-600 dark:text-red-400">
                    &#9888; {signal.earlyWarning}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* ⑤ 멘토 인사이트 */}
        {mentorInsights && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">멘토 인사이트</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {repeatedAdviceLines.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2">반복 강조 조언</p>
                  <ul className="space-y-1">
                    {repeatedAdviceLines.map((line, i) => (
                      <li key={i} className="text-sm flex items-start gap-2">
                        <span className="shrink-0 text-primary">&#8226;</span>
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {ignoredAdviceLines.length > 0 && (
                <div className="rounded-lg border border-red-200 bg-red-50/50 p-3 dark:border-red-800 dark:bg-red-950/50">
                  <p className="text-xs font-semibold text-red-800 dark:text-red-200 mb-2">
                    &#9888; 반복됐지만 미실행
                  </p>
                  <ul className="space-y-1">
                    {ignoredAdviceLines.map((line, i) => (
                      <li key={i} className="text-sm text-red-700 dark:text-red-300 flex items-start gap-2">
                        <span className="shrink-0">&#8226;</span>
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {mentorInsights.executedAdvice && (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1">멘토 매칭 적합성</p>
                    <p className="text-sm leading-relaxed">{mentorInsights.executedAdvice}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* ⑥ 리소스 진단 */}
        {mentorInsights && (primaryNeed || dcampCanDoLines.length > 0) && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">리소스 진단</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {primaryNeed && (
                <div>
                  <p className="text-base font-semibold">{primaryNeed}</p>
                  {resourceReasoning && (
                    <p className="text-sm text-muted-foreground mt-1">{resourceReasoning}</p>
                  )}
                </div>
              )}

              {dcampCanDoLines.length > 0 && (
                <div className="rounded-lg bg-blue-50 dark:bg-blue-950 p-3">
                  <p className="text-xs font-semibold text-blue-800 dark:text-blue-200 mb-2">
                    dcamp 지원 가능
                  </p>
                  <ul className="space-y-1">
                    {dcampCanDoLines.map((line, i) => (
                      <li key={i} className="text-sm text-blue-700 dark:text-blue-300 flex items-start gap-2">
                        <span className="shrink-0">&#8226;</span>
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ⑦ 미팅 전략 */}
        {meetingStrategy && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">미팅 전략</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {meetingStrategy.focus && (
                <div className="rounded-lg bg-primary/5 border-2 border-primary/20 p-4">
                  <p className="text-xs font-semibold text-primary mb-1">이번 세션 핵심</p>
                  <p className="text-base font-semibold">{meetingStrategy.focus}</p>
                </div>
              )}

              {meetingStrategy.keyQuestions && meetingStrategy.keyQuestions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground">핵심 질문</p>
                  {meetingStrategy.keyQuestions.map((q, i) => (
                    <div
                      key={i}
                      className="flex items-start justify-between gap-2 rounded-lg border p-3"
                    >
                      <div className="flex items-start gap-2 min-w-0">
                        <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                          Q{i + 1}
                        </span>
                        <p className="text-sm">{q}</p>
                      </div>
                      <CopyButton text={q} />
                    </div>
                  ))}
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                {meetingStrategy.openingLine && (
                  <div className="rounded-lg bg-amber-50 dark:bg-amber-950 p-3">
                    <p className="text-xs font-semibold text-amber-800 dark:text-amber-200 mb-1">
                      주목할 것
                    </p>
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      {meetingStrategy.openingLine}
                    </p>
                  </div>
                )}
                {meetingStrategy.avoid && (
                  <div className="rounded-lg bg-red-50 dark:bg-red-950 p-3">
                    <p className="text-xs font-semibold text-red-800 dark:text-red-200 mb-1">
                      피해야 할 것
                    </p>
                    <p className="text-sm text-red-700 dark:text-red-300">
                      {meetingStrategy.avoid}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ⑧ PM 액션 */}
        {pmActions && pmActions.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">PM 액션</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pmActions.map((action, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 rounded-lg border p-3"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                      {action.priority}
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium">{action.action}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                        <Badge variant="outline" className="text-xs">
                          {action.deadline}
                        </Badge>
                        <span>{action.why}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

      {/* ── 갱신 중 오버레이 닫기 ─────────────────── */}
      </div>
    </div>
  );
}
