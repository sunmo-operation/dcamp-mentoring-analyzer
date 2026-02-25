"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { PulseReport } from "@/lib/agents/types";

interface PulseTabProps {
  pulse: PulseReport;
}

// ── 건강 상태 색상 ──────────────────────────────
const STATUS_STYLE: Record<string, { bg: string; dot: string }> = {
  good: { bg: "bg-green-50 dark:bg-green-950/30", dot: "bg-green-500" },
  warning: { bg: "bg-amber-50 dark:bg-amber-950/30", dot: "bg-amber-500" },
  concern: { bg: "bg-red-50 dark:bg-red-950/30", dot: "bg-red-500" },
};

// ── 마일스톤 카테고리 색상 ──────────────────────────
const MILESTONE_STYLE: Record<string, string> = {
  "성과": "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  "전환점": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  "의사결정": "bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200",
  "리스크": "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  "외부": "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200",
};

function trendIcon(trend: PulseReport["meetingCadence"]["trend"]): string {
  switch (trend) {
    case "accelerating": return "↑";
    case "stable": return "→";
    case "slowing": return "↓";
    case "irregular": return "~";
  }
}

export function PulseTab({ pulse }: PulseTabProps) {
  const { meetingCadence, milestones, healthSignals, summary, qualitativeAssessment: qa } = pulse;

  return (
    <div className="space-y-6">
      {/* ── 헤더 + 종합 평가 ─────────────────────────── */}
      <div>
        <h2 className="text-xl font-bold">팀 펄스</h2>
        <p className="text-sm text-muted-foreground">
          멘토링 준비를 위한 팀 상태 종합 진단
        </p>
        {summary && (
          <p className="mt-2 text-sm font-medium rounded-lg bg-muted/50 px-3 py-2">
            {summary}
          </p>
        )}
      </div>

      {/* ── 종합 서술 평가 ───────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">종합 평가</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed text-foreground">
            {qa.overallNarrative}
          </p>
        </CardContent>
      </Card>

      {/* ── 멘토링 정기성 ────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            멘토링 정기성
            <Badge variant={qa.mentoringRegularity.meetsMonthlyTarget ? "default" : "destructive"} className="text-xs ml-auto">
              {qa.mentoringRegularity.meetsMonthlyTarget ? "월 1회 이상 충족" : "월 1회 미달"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {qa.mentoringRegularity.assessment}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {qa.mentoringRegularity.recentMonthBreakdown.map((m) => (
              <div key={m.month} className={`rounded-xl p-3 text-center ${m.count > 0 ? "bg-green-50 dark:bg-green-950/30" : "bg-red-50 dark:bg-red-950/30"}`}>
                <p className={`text-2xl font-bold tabular-nums ${m.count > 0 ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400"}`}>
                  {m.count}<span className="text-sm font-normal">건</span>
                </p>
                <p className="text-xs text-muted-foreground">{m.month}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── 전담멘토 관계 ────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            전담멘토 관계
            {qa.dedicatedMentorEngagement.hasDedicatedMentor && (
              <Badge variant="outline" className="text-xs ml-auto">
                {qa.dedicatedMentorEngagement.mentorName}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {qa.dedicatedMentorEngagement.assessment}
          </p>
          {qa.dedicatedMentorEngagement.hasDedicatedMentor && qa.dedicatedMentorEngagement.totalMeetings > 0 && (
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-muted/40 p-3 text-center">
                <p className="text-2xl font-bold tabular-nums">{qa.dedicatedMentorEngagement.totalMeetings}</p>
                <p className="text-xs text-muted-foreground">총 만남</p>
              </div>
              <div className="rounded-xl bg-muted/40 p-3 text-center">
                <p className="text-2xl font-bold tabular-nums">
                  {qa.dedicatedMentorEngagement.avgIntervalDays ?? "-"}<span className="text-sm font-normal">일</span>
                </p>
                <p className="text-xs text-muted-foreground">평균 간격</p>
              </div>
              <div className="rounded-xl bg-muted/40 p-3 text-center">
                <p className={`text-2xl font-bold ${qa.dedicatedMentorEngagement.isRegular ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"}`}>
                  {qa.dedicatedMentorEngagement.isRegular ? "정기" : "불규칙"}
                </p>
                <p className="text-xs text-muted-foreground">만남 패턴</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── 전문가 리소스 활용 ───────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            전문가 리소스 활용
            <Badge variant="outline" className="text-xs ml-auto">
              {qa.expertRequestActivity.totalRequests}건 요청
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {qa.expertRequestActivity.assessment}
          </p>
          {qa.expertRequestActivity.totalRequests > 0 && (
            <div className="mt-3 flex gap-3">
              <div className="rounded-xl bg-muted/40 px-4 py-2 text-center">
                <p className="text-lg font-bold tabular-nums">{qa.expertRequestActivity.totalRequests}</p>
                <p className="text-xs text-muted-foreground">총 요청</p>
              </div>
              <div className="rounded-xl bg-muted/40 px-4 py-2 text-center">
                <p className="text-lg font-bold tabular-nums text-green-600 dark:text-green-400">{qa.expertRequestActivity.completedRequests}</p>
                <p className="text-xs text-muted-foreground">완료</p>
              </div>
              <div className="rounded-xl bg-muted/40 px-4 py-2 text-center">
                <p className="text-lg font-bold tabular-nums text-amber-600 dark:text-amber-400">{qa.expertRequestActivity.totalRequests - qa.expertRequestActivity.completedRequests}</p>
                <p className="text-xs text-muted-foreground">진행 중</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── 미팅 현황 요약 ───────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">미팅 현황</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl bg-muted/40 p-3 text-center">
              <p className="text-2xl font-bold tabular-nums">{meetingCadence.totalSessions}</p>
              <p className="text-xs text-muted-foreground">총 미팅</p>
            </div>
            <div className="rounded-xl bg-muted/40 p-3 text-center">
              <p className="text-2xl font-bold tabular-nums">{meetingCadence.avgIntervalDays}<span className="text-sm font-normal">일</span></p>
              <p className="text-xs text-muted-foreground">평균 간격</p>
            </div>
            <div className="rounded-xl bg-muted/40 p-3 text-center">
              <p className="text-2xl font-bold tabular-nums">{meetingCadence.recentIntervalDays}<span className="text-sm font-normal">일</span></p>
              <p className="text-xs text-muted-foreground">최근 간격</p>
            </div>
            <div className="rounded-xl bg-muted/40 p-3 text-center">
              <p className="text-2xl font-bold tabular-nums">
                {trendIcon(meetingCadence.trend)}
              </p>
              <p className="text-xs text-muted-foreground">
                {meetingCadence.trend === "accelerating" ? "가속" :
                 meetingCadence.trend === "stable" ? "안정" :
                 meetingCadence.trend === "slowing" ? "둔화" : "불규칙"}
              </p>
            </div>
          </div>

          {meetingCadence.trendReason && (
            <p className="text-sm text-muted-foreground">{meetingCadence.trendReason}</p>
          )}

          {meetingCadence.byType.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {meetingCadence.byType.map((t) => (
                <Badge key={t.type} variant="outline" className="text-xs gap-1">
                  {t.type}
                  <span className="font-bold">{t.count}회</span>
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── 주의 신호 ─────────────────────────── */}
      {healthSignals.filter((s) => s.status !== "good").length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">주의 신호</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {healthSignals.filter((s) => s.status !== "good").map((s, i) => {
              const style = STATUS_STYLE[s.status] || STATUS_STYLE.warning;
              return (
                <div key={i} className={`flex items-start gap-3 rounded-xl p-3 ${style.bg}`}>
                  <div className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${style.dot}`} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{s.signal}</p>
                    <p className="text-xs text-muted-foreground">{s.detail}</p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* ── 긍정 신호 (접힌 상태) ────────────────── */}
      {healthSignals.filter((s) => s.status === "good").length > 0 && (
        <details className="group">
          <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors">
            긍정 신호 {healthSignals.filter((s) => s.status === "good").length}건 보기
          </summary>
          <div className="mt-2 space-y-2">
            {healthSignals.filter((s) => s.status === "good").map((s, i) => {
              const style = STATUS_STYLE.good;
              return (
                <div key={i} className={`flex items-start gap-3 rounded-xl p-3 ${style.bg}`}>
                  <div className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${style.dot}`} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{s.signal}</p>
                    <p className="text-xs text-muted-foreground">{s.detail}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </details>
      )}

      {/* ── 마일스톤 타임라인 ─────────────────── */}
      {milestones.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">주요 마일스톤</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative space-y-0">
              <div className="absolute left-[79px] top-2 bottom-2 w-px bg-border sm:left-[95px]" />

              {milestones.map((m, i) => (
                <div key={i} className="relative flex items-start gap-3 py-3">
                  <div className="w-[70px] shrink-0 text-right sm:w-[86px]">
                    <p className="text-xs tabular-nums text-muted-foreground">
                      {formatDate(m.date)}
                    </p>
                  </div>
                  <div className="relative z-10 mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full border-2 border-background bg-primary" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={`text-[10px] ${MILESTONE_STYLE[m.category] || MILESTONE_STYLE["외부"]}`}>
                        {m.category}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{m.source}</span>
                    </div>
                    <p className="mt-0.5 text-sm leading-relaxed">{m.title}</p>
                    {m.detail && m.detail !== m.title && (
                      <p className="text-xs text-muted-foreground mt-0.5">{m.detail}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {milestones.length === 0 && (
        <div className="rounded-xl bg-muted/30 p-8 text-center">
          <p className="text-sm text-muted-foreground">
            멘토링 기록에서 마일스톤을 감지하지 못했습니다
          </p>
        </div>
      )}
    </div>
  );
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
  } catch {
    return dateStr;
  }
}
