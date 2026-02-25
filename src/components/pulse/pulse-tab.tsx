"use client";

import { useState } from "react";
import type { PulseReport } from "@/lib/agents/types";

interface PulseTabProps {
  pulse: PulseReport;
}

// 하이라이트 카테고리 (성과/전환/리스크 등 특별 이벤트)
const HIGHLIGHT_CATEGORIES = new Set(["성과", "전환점", "리스크", "의사결정", "외부"]);

// 카테고리별 스타일
const CATEGORY_STYLE: Record<string, { dot: string; label: string }> = {
  "멘토링": { dot: "bg-foreground/25", label: "멘토링" },
  "점검": { dot: "bg-blue-400", label: "점검" },
  "전문가투입": { dot: "bg-violet-400", label: "전문가 투입" },
  "전문가요청": { dot: "bg-violet-400", label: "전문가 요청" },
  "코칭": { dot: "bg-teal-400", label: "코칭" },
  "성과": { dot: "bg-emerald-400", label: "성과" },
  "전환점": { dot: "bg-amber-400", label: "전환점" },
  "리스크": { dot: "bg-rose-400", label: "리스크" },
  "의사결정": { dot: "bg-blue-400", label: "의사결정" },
  "외부": { dot: "bg-foreground/30", label: "외부" },
};

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}/${String(d.getDate()).padStart(2, "0")}`;
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

const INITIAL_COUNT = 25;

export function PulseTab({ pulse }: PulseTabProps) {
  const { milestones } = pulse;
  const [showAll, setShowAll] = useState(false);
  const visibleEntries = showAll ? milestones : milestones.slice(0, INITIAL_COUNT);

  // 월별 그룹핑
  const groups: { monthKey: string; label: string; items: typeof milestones }[] = [];
  let current = "";
  for (const m of visibleEntries) {
    const mk = getMonthKey(m.date);
    if (mk !== current) {
      current = mk;
      groups.push({ monthKey: mk, label: formatMonthHeader(m.date), items: [] });
    }
    groups[groups.length - 1].items.push(m);
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold">배치 타임라인</h2>
        <p className="text-sm text-muted-foreground">
          {milestones.length > 0
            ? `총 ${milestones.length}건의 활동 기록`
            : "기록이 없습니다"}
        </p>
      </div>

      {groups.length > 0 ? (
        <div className="space-y-6">
          {groups.map((group) => (
            <section key={group.monthKey}>
              {/* 월 헤더 */}
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xs font-medium text-muted-foreground tracking-wide">
                  {group.label}
                </span>
                <div className="h-px flex-1 bg-border" />
              </div>

              {/* 항목 리스트 — 일관된 row 구조 */}
              <div>
                {group.items.map((m, i) => {
                  const isHighlight = m.isHighlight || HIGHLIGHT_CATEGORIES.has(m.category);
                  const style = CATEGORY_STYLE[m.category] || { dot: "bg-foreground/20", label: m.category };

                  // summary에서 → 이후 부분(후속 액션)을 분리
                  let mainSummary = "";
                  let followUp = "";
                  if (m.summary) {
                    const lines = m.summary.split("\n");
                    mainSummary = lines.filter(l => !l.startsWith("→")).join(" ").trim();
                    followUp = lines.filter(l => l.startsWith("→")).join(" ").trim();
                  }
                  // 하이라이트인데 summary 없으면 detail 표시
                  if (!mainSummary && isHighlight && m.detail && m.detail !== m.title) {
                    mainSummary = m.detail;
                  }

                  return (
                    <div
                      key={`${group.monthKey}-${i}`}
                      className={`flex gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/40 ${
                        isHighlight ? "bg-muted/30" : ""
                      }`}
                    >
                      {/* 날짜 열 (고정폭) */}
                      <span className="text-[13px] tabular-nums text-muted-foreground w-[34px] shrink-0 pt-px">
                        {formatDate(m.date)}
                      </span>

                      {/* 콘텐츠 열 */}
                      <div className="min-w-0 flex-1">
                        {/* Line 1: dot + category + title */}
                        <p className="flex items-center gap-1.5 text-[13px] leading-snug">
                          <span className={`w-[5px] h-[5px] rounded-full shrink-0 ${style.dot}`} />
                          <span className="text-muted-foreground shrink-0">{style.label}</span>
                          <span className="text-muted-foreground/50">·</span>
                          <span className={`truncate ${isHighlight ? "font-medium" : ""}`}>
                            {m.title}
                          </span>
                        </p>

                        {/* Line 2: 요약 (한 줄 고정) */}
                        {mainSummary && (
                          <p className="text-[12px] text-muted-foreground leading-normal mt-0.5 pl-[11px] line-clamp-1">
                            {mainSummary}
                          </p>
                        )}

                        {/* Line 3: 후속 액션 (한 줄 고정) */}
                        {followUp && (
                          <p className="text-[12px] text-muted-foreground/60 leading-normal mt-0.5 pl-[11px] line-clamp-1">
                            {followUp}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}

          {!showAll && milestones.length > INITIAL_COUNT && (
            <button
              onClick={() => setShowAll(true)}
              className="w-full rounded-2xl border border-border bg-muted/30 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/60"
            >
              전체 보기 ({milestones.length - INITIAL_COUNT}건 더)
            </button>
          )}
        </div>
      ) : (
        <div className="rounded-xl bg-muted/30 p-8 text-center">
          <p className="text-sm text-muted-foreground">기록이 없습니다</p>
        </div>
      )}
    </div>
  );
}
