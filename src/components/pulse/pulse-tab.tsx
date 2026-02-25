"use client";

import { useState } from "react";
import type { PulseReport } from "@/lib/agents/types";

interface PulseTabProps {
  pulse: PulseReport;
}

const HIGHLIGHT_CATEGORIES = new Set(["성과", "전환점", "리스크", "의사결정", "외부"]);

// 카테고리 배지 스타일
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

function getMonthKey(dateStr: string): string {
  return dateStr.slice(0, 7);
}

function getYear(dateStr: string): string {
  return dateStr.slice(0, 4);
}

function formatMonth(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}월`;
  } catch {
    return dateStr;
  }
}

const INITIAL_COUNT = 25;

export function PulseTab({ pulse }: PulseTabProps) {
  const { milestones } = pulse;
  const [showAll, setShowAll] = useState(false);
  const visibleEntries = showAll ? milestones : milestones.slice(0, INITIAL_COUNT);

  // 연도 > 월별 이중 그룹핑
  type MonthGroup = { monthKey: string; month: string; items: typeof milestones };
  type YearGroup = { year: string; months: MonthGroup[] };

  const yearGroups: YearGroup[] = [];
  let curYear = "";
  let curMonth = "";

  for (const m of visibleEntries) {
    const y = getYear(m.date);
    const mk = getMonthKey(m.date);

    if (y !== curYear) {
      curYear = y;
      curMonth = mk;
      yearGroups.push({ year: y, months: [{ monthKey: mk, month: formatMonth(m.date), items: [] }] });
    } else if (mk !== curMonth) {
      curMonth = mk;
      yearGroups[yearGroups.length - 1].months.push({ monthKey: mk, month: formatMonth(m.date), items: [] });
    }

    const yg = yearGroups[yearGroups.length - 1];
    yg.months[yg.months.length - 1].items.push(m);
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

      {yearGroups.length > 0 ? (
        <div>
          {yearGroups.map((yg, yi) => (
            <div key={yg.year}>
              {/* ── 연도 헤더 ── */}
              {yi > 0 && <div className="h-px bg-border mt-8 mb-6" />}
              <h3 className="text-[15px] font-bold mb-5">{yg.year}년</h3>

              {yg.months.map((mg, mi) => (
                <section key={mg.monthKey} className={mi > 0 ? "mt-6" : ""}>
                  {/* 월 헤더 */}
                  <p className="text-[12px] font-medium text-muted-foreground/70 mb-3">{mg.month}</p>

                  {/* 항목 리스트 */}
                  <div className="space-y-4">
                    {mg.items.map((m, i) => {
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
                        <div key={`${mg.monthKey}-${i}`}>
                          {/* 첫 줄: 날짜 배지 + 카테고리 배지 + 제목 */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="inline-flex items-center rounded-md border border-border px-1.5 py-0.5 text-[11px] tabular-nums text-muted-foreground font-medium">
                              {formatDate(m.date)}
                            </span>
                            <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium ${
                              badgeStyle || "text-muted-foreground bg-muted/50"
                            }`}>
                              {label}
                            </span>
                            <span className={`text-[13px] leading-snug ${isHighlight ? "font-semibold" : ""}`}>
                              {m.title}
                            </span>
                          </div>

                          {/* 요약 */}
                          {mainSummary && (
                            <p className="text-[12px] text-muted-foreground leading-relaxed mt-1.5 break-keep">
                              {mainSummary}
                            </p>
                          )}

                          {/* 후속 액션 */}
                          {followUp && (
                            <p className="text-[12px] text-muted-foreground/50 leading-relaxed mt-0.5 break-keep">
                              {followUp}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
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
