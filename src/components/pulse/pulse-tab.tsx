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

// ── 밀도 점수 색상 ──────────────────────────────
function densityColor(score: number): string {
  if (score >= 70) return "text-green-600 dark:text-green-400";
  if (score >= 40) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function trendIcon(trend: PulseReport["meetingCadence"]["trend"]): string {
  switch (trend) {
    case "accelerating": return "↑";
    case "stable": return "→";
    case "slowing": return "↓";
    case "irregular": return "~";
  }
}

export function PulseTab({ pulse }: PulseTabProps) {
  const { meetingCadence, milestones, healthSignals } = pulse;

  return (
    <div className="space-y-6">
      {/* ── 헤더 ─────────────────────────────── */}
      <div>
        <h2 className="text-xl font-bold">팀 펄스</h2>
        <p className="text-sm text-muted-foreground">
          미팅 밀도, 주요 마일스톤, 건강 신호를 한눈에
        </p>
      </div>

      {/* ── 미팅 밀도 카드 ─────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            미팅 밀도
            <span className={`text-2xl font-bold tabular-nums ${densityColor(meetingCadence.densityScore)}`}>
              {meetingCadence.densityScore}
            </span>
            <span className="text-xs text-muted-foreground font-normal">/ 100</span>
            <Badge variant="outline" className="ml-auto text-xs">
              {meetingCadence.densityLabel}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 핵심 지표 */}
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

          {/* 트렌드 설명 */}
          {meetingCadence.trendReason && (
            <p className="text-sm text-muted-foreground">{meetingCadence.trendReason}</p>
          )}

          {/* 유형별 분포 */}
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

      {/* ── 건강 신호 ─────────────────────────── */}
      {healthSignals.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">건강 신호</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {healthSignals.map((s, i) => {
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

      {/* ── 마일스톤 타임라인 ─────────────────── */}
      {milestones.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">주요 마일스톤</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative space-y-0">
              {/* 세로 연결선 */}
              <div className="absolute left-[79px] top-2 bottom-2 w-px bg-border sm:left-[95px]" />

              {milestones.map((m, i) => (
                <div key={i} className="relative flex items-start gap-3 py-3">
                  {/* 날짜 */}
                  <div className="w-[70px] shrink-0 text-right sm:w-[86px]">
                    <p className="text-xs tabular-nums text-muted-foreground">
                      {formatDate(m.date)}
                    </p>
                  </div>
                  {/* 점 */}
                  <div className="relative z-10 mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full border-2 border-background bg-primary" />
                  {/* 내용 */}
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
