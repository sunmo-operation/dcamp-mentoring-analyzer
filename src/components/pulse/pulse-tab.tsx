"use client";

import { useState } from "react";
import type { PulseReport } from "@/lib/agents/types";

interface PulseTabProps {
  pulse: PulseReport;
}

const HIGHLIGHT_CATEGORIES = new Set(["성과", "전환점", "리스크", "의사결정", "외부"]);

// 카테고리 배지 스타일: [텍스트색, 배경색]
const CATEGORY_BADGE: Record<string, string> = {
  "성과": "text-emerald-700 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-950/60",
  "전환점": "text-amber-700 bg-amber-50 dark:text-amber-300 dark:bg-amber-950/60",
  "리스크": "text-rose-700 bg-rose-50 dark:text-rose-300 dark:bg-rose-950/60",
  "의사결정": "text-blue-700 bg-blue-50 dark:text-blue-300 dark:bg-blue-950/60",
  "외부": "text-violet-700 bg-violet-50 dark:text-violet-300 dark:bg-violet-950/60",
};

const CATEGORY_LABEL: Record<string, string> = {
  "멘토링": "멘토링",
  "점검": "점검",
  "전문가투입": "전문가 투입",
  "전문가요청": "전문가 요청",
  "코칭": "코칭",
  "성과": "성과",
  "전환점": "전환점",
  "리스크": "리스크",
  "의사결정": "의사결정",
  "외부": "외부",
};

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}.${String(d.getDate()).padStart(2, "0")}`;
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
      <div className="mb-8">
        <h2 className="text-xl font-bold tracking-tight">배치 타임라인</h2>
        <p className="text-[13px] text-muted-foreground mt-1">
          {milestones.length > 0
            ? `총 ${milestones.length}건의 활동 기록`
            : "기록이 없습니다"}
        </p>
      </div>

      {groups.length > 0 ? (
        <div>
          {groups.map((group, gi) => (
            <section key={group.monthKey}>
              {/* 월 구분 */}
              {gi > 0 && <div className="h-px bg-border my-7" />}
              <h3 className="text-[13px] font-semibold mb-4">{group.label}</h3>

              {/* 항목 리스트 */}
              <div className="space-y-4">
                {group.items.map((m, i) => {
                  const isHighlight = m.isHighlight || HIGHLIGHT_CATEGORIES.has(m.category);
                  const label = CATEGORY_LABEL[m.category] || m.category;
                  const badgeStyle = CATEGORY_BADGE[m.category];

                  // summary → 요약 / 후속 액션 분리
                  let mainSummary = "";
                  let followUp = "";
                  if (m.summary) {
                    const lines = m.summary.split("\n");
                    mainSummary = lines.filter(l => !l.startsWith("→")).join(" ").trim();
                    followUp = lines.filter(l => l.startsWith("→")).join(" ").trim();
                  }
                  if (!mainSummary && isHighlight && m.detail && m.detail !== m.title) {
                    mainSummary = m.detail;
                  }

                  return (
                    <div key={`${group.monthKey}-${i}`}>
                      {/* 첫 줄: 날짜 배지 + 카테고리 배지 + 제목 */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* 날짜 배지 */}
                        <span className="inline-flex items-center rounded-md bg-muted/60 px-1.5 py-0.5 text-[11px] tabular-nums text-muted-foreground font-medium">
                          {formatDate(m.date)}
                        </span>

                        {/* 카테고리 배지 */}
                        <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium ${
                          badgeStyle || "text-muted-foreground bg-muted/40"
                        }`}>
                          {label}
                        </span>

                        {/* 제목 */}
                        <span className={`text-[13px] ${isHighlight ? "font-semibold" : ""}`}>
                          {m.title}
                        </span>
                      </div>

                      {/* 요약 (둘째 줄) */}
                      {mainSummary && (
                        <p className="text-[12px] text-muted-foreground leading-relaxed mt-1 ml-[0.5px] line-clamp-2">
                          {mainSummary}
                        </p>
                      )}

                      {/* 후속 액션 (셋째 줄) */}
                      {followUp && (
                        <p className="text-[12px] text-muted-foreground/50 leading-relaxed mt-0.5 ml-[0.5px] line-clamp-1">
                          {followUp}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}

          {!showAll && milestones.length > INITIAL_COUNT && (
            <button
              onClick={() => setShowAll(true)}
              className="w-full mt-8 py-3 text-[13px] font-medium text-muted-foreground border border-border rounded-xl transition-colors hover:bg-muted/30"
            >
              전체 보기 ({milestones.length - INITIAL_COUNT}건 더)
            </button>
          )}
        </div>
      ) : (
        <div className="py-16 text-center">
          <p className="text-[13px] text-muted-foreground">기록이 없습니다</p>
        </div>
      )}
    </div>
  );
}
