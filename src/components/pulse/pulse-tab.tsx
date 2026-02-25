"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import type { PulseReport } from "@/lib/agents/types";

interface PulseTabProps {
  pulse: PulseReport;
}

// ── 건강 신호 배지 스타일 ──────────────────────────
const STATUS_BADGE: Record<string, { icon: string; style: string }> = {
  good: { icon: "✓", style: "text-green-700 bg-green-50 border-green-200" },
  warning: { icon: "!", style: "text-amber-700 bg-amber-50 border-amber-200" },
  concern: { icon: "✕", style: "text-red-700 bg-red-50 border-red-200" },
};

// ── 타임라인 카테고리 스타일 ─────────────────────────
const CATEGORY_STYLE: Record<
  string,
  { icon: string; label: string; dot: string; badge: string }
> = {
  "멘토링": { icon: "📝", label: "멘토링", dot: "bg-blue-400", badge: "bg-blue-50 text-blue-700 border-blue-200" },
  "점검": { icon: "🔍", label: "점검", dot: "bg-indigo-400", badge: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  "전문가투입": { icon: "🎓", label: "전문가투입", dot: "bg-purple-400", badge: "bg-purple-50 text-purple-700 border-purple-200" },
  "전문가요청": { icon: "📋", label: "전문가요청", dot: "bg-cyan-400", badge: "bg-cyan-50 text-cyan-700 border-cyan-200" },
  "코칭": { icon: "💬", label: "코칭", dot: "bg-orange-400", badge: "bg-orange-50 text-orange-700 border-orange-200" },
  "성과": { icon: "🎯", label: "성과", dot: "bg-green-500", badge: "bg-green-50 text-green-800 border-green-200" },
  "전환점": { icon: "🔄", label: "전환점", dot: "bg-blue-500", badge: "bg-blue-50 text-blue-800 border-blue-200" },
  "리스크": { icon: "⚠️", label: "리스크", dot: "bg-red-500", badge: "bg-red-50 text-red-800 border-red-200" },
  "의사결정": { icon: "💡", label: "의사결정", dot: "bg-violet-500", badge: "bg-violet-50 text-violet-800 border-violet-200" },
  "외부": { icon: "🏛️", label: "외부", dot: "bg-slate-400", badge: "bg-slate-50 text-slate-700 border-slate-200" },
};

// ── 유틸 ──────────────────────────────────────────
function trendLabel(trend: PulseReport["meetingCadence"]["trend"]): string {
  switch (trend) {
    case "accelerating": return "가속 ↑";
    case "stable": return "안정 →";
    case "slowing": return "둔화 ↓";
    case "irregular": return "불규칙 ~";
  }
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return `${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
  } catch {
    return dateStr;
  }
}

function formatMonthHeader(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return `${d.getFullYear()}년 ${d.getMonth() + 1}월`;
  } catch {
    return dateStr;
  }
}

function getMonthKey(dateStr: string): string {
  return dateStr.slice(0, 7);
}

// ── 메인 컴포넌트 ─────────────────────────────────
const INITIAL_COUNT = 20;

export function PulseTab({ pulse }: PulseTabProps) {
  const { meetingCadence, milestones, healthSignals, qualitativeAssessment: qa } = pulse;
  const [showAll, setShowAll] = useState(false);

  const visibleEntries = showAll ? milestones : milestones.slice(0, INITIAL_COUNT);

  const warnings = healthSignals.filter((s) => s.status !== "good");
  const positives = healthSignals.filter((s) => s.status === "good");

  return (
    <div className="space-y-6">
      {/* ── 헤더 ─────────────────────────── */}
      <div>
        <h2 className="text-xl font-bold">팀 펄스</h2>
        <p className="text-sm text-muted-foreground">
          디캠프 배치와 함께한 여정
        </p>
      </div>

      {/* ── 핵심 지표 카드 ─────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl bg-muted/40 p-4 text-center">
          <p className="text-2xl font-bold tabular-nums">{meetingCadence.totalSessions}</p>
          <p className="text-xs text-muted-foreground mt-0.5">총 미팅</p>
        </div>
        <div className="rounded-2xl bg-muted/40 p-4 text-center">
          <p className="text-2xl font-bold tabular-nums">
            {meetingCadence.avgIntervalDays}<span className="text-sm font-normal">일</span>
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">평균 간격</p>
        </div>
        <div className="rounded-2xl bg-muted/40 p-4 text-center">
          <p className="text-2xl font-bold tabular-nums">
            {pulse.programEngagement.overallScore}<span className="text-sm font-normal">점</span>
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">프로그램 참여</p>
        </div>
        <div className="rounded-2xl bg-muted/40 p-4 text-center">
          <p className="text-lg font-bold leading-8">{trendLabel(meetingCadence.trend)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">미팅 추세</p>
        </div>
      </div>

      {/* ── 상태 신호 (인라인 배지) ────────── */}
      {(warnings.length > 0 || positives.length > 0) && (
        <div className="flex flex-wrap gap-2">
          {warnings.map((s, i) => {
            const st = STATUS_BADGE[s.status] || STATUS_BADGE.warning;
            return (
              <div
                key={`w-${i}`}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium ${st.style}`}
              >
                <span className="font-bold text-[10px]">{st.icon}</span>
                {s.signal}
              </div>
            );
          })}
          {positives.map((s, i) => {
            const st = STATUS_BADGE.good;
            return (
              <div
                key={`g-${i}`}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium ${st.style}`}
              >
                <span className="font-bold text-[10px]">{st.icon}</span>
                {s.signal}
              </div>
            );
          })}
        </div>
      )}

      {/* ── 종합 평가 ─────────────────────── */}
      <div className="rounded-2xl bg-muted/30 px-4 py-3">
        <p className="text-sm leading-relaxed">{qa.overallNarrative}</p>
      </div>

      {/* ── 전담멘토 (있는 경우만) ─────────── */}
      {qa.dedicatedMentorEngagement.hasDedicatedMentor && (
        <div className="flex items-center gap-3 rounded-2xl border border-border/50 px-4 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm shrink-0">
            <span role="img" aria-label="멘토">👤</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">
              전담멘토 {qa.dedicatedMentorEngagement.mentorName}
            </p>
            <p className="text-xs text-muted-foreground">
              {qa.dedicatedMentorEngagement.totalMeetings > 0
                ? `총 ${qa.dedicatedMentorEngagement.totalMeetings}회 만남 · 평균 ${qa.dedicatedMentorEngagement.avgIntervalDays ?? "?"}일 간격 · ${qa.dedicatedMentorEngagement.isRegular ? "정기적" : "불규칙"}`
                : "미팅 기록 없음"}
            </p>
          </div>
        </div>
      )}

      {/* ── 주요 마일스톤 타임라인 ─────────── */}
      <div>
        <h3 className="text-lg font-bold mb-1">주요 마일스톤</h3>
        <p className="text-xs text-muted-foreground mb-4">
          {milestones.length > 0
            ? `총 ${milestones.length}건의 활동 기록`
            : "멘토링 기록에서 마일스톤을 감지하지 못했습니다"}
        </p>

        {visibleEntries.length > 0 && (
          <TimelineView entries={visibleEntries} />
        )}

        {!showAll && milestones.length > INITIAL_COUNT && (
          <button
            onClick={() => setShowAll(true)}
            className="mt-3 w-full rounded-2xl border border-border bg-muted/30 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/60"
          >
            전체 보기 ({milestones.length - INITIAL_COUNT}건 더)
          </button>
        )}

        {milestones.length === 0 && (
          <div className="rounded-xl bg-muted/30 p-8 text-center">
            <p className="text-sm text-muted-foreground">
              기록이 없습니다
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── 타임라인 서브 컴포넌트 ─────────────────────────
type MilestoneEntry = PulseReport["milestones"][0];

function TimelineView({ entries }: { entries: MilestoneEntry[] }) {
  // 월별 그룹핑
  const groups: { monthKey: string; label: string; items: MilestoneEntry[] }[] = [];
  let current = "";

  for (const m of entries) {
    const mk = getMonthKey(m.date);
    if (mk !== current) {
      current = mk;
      groups.push({ monthKey: mk, label: formatMonthHeader(m.date), items: [] });
    }
    groups[groups.length - 1].items.push(m);
  }

  return (
    <div className="space-y-0">
      {groups.map((group) => (
        <div key={group.monthKey}>
          {/* 월 헤더 */}
          <div className="flex items-center gap-3 py-2">
            <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
              {group.label}
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>

          {/* 타임라인 항목들 */}
          <div className="relative ml-1">
            {/* 연속 세로선 */}
            <div className="absolute left-[5px] top-0 bottom-0 w-0.5 bg-border/50" />

            {group.items.map((m, i) => {
              const cat = CATEGORY_STYLE[m.category] || CATEGORY_STYLE["멘토링"];
              return (
                <div key={`${group.monthKey}-${i}`} className="relative flex items-start gap-4 py-2.5">
                  {/* 도트 (고정폭 컨테이너) */}
                  <div className="w-3 shrink-0 flex justify-center">
                    <div
                      className={`relative z-10 mt-1.5 rounded-full ring-2 ring-background ${
                        m.isHighlight ? "h-3 w-3" : "h-2.5 w-2.5"
                      } ${cat.dot}`}
                    />
                  </div>

                  {/* 콘텐츠 */}
                  <div className={`min-w-0 flex-1 ${m.isHighlight ? "rounded-xl bg-muted/30 px-3 py-2 -my-0.5" : ""}`}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {formatDate(m.date)}
                      </span>
                      <Badge
                        variant="outline"
                        className={`text-[10px] leading-none px-1.5 py-0.5 ${cat.badge}`}
                      >
                        {cat.label}
                      </Badge>
                      {m.source !== "노션" && (
                        <span className="text-[10px] text-muted-foreground">{m.source}</span>
                      )}
                    </div>
                    <p className={`mt-0.5 text-sm leading-snug ${m.isHighlight ? "font-medium" : ""}`}>
                      {m.title}
                    </p>
                    {m.isHighlight && m.detail && m.detail !== m.title && (
                      <p className="text-xs text-muted-foreground mt-0.5">{m.detail}</p>
                    )}
                    {!m.isHighlight && m.summary && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{m.summary}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
