"use client";

import { useState } from "react";
import type { PulseReport } from "@/lib/agents/types";

interface PulseTabProps {
  pulse: PulseReport;
}

const HIGHLIGHT_CATEGORIES = new Set(["성과", "전환점", "리스크", "의사결정", "외부"]);

// 하이라이트 카테고리만 컬러 텍스트 (일반 항목은 muted)
const CATEGORY_COLOR: Record<string, string> = {
  "성과": "text-emerald-600 dark:text-emerald-400",
  "전환점": "text-amber-600 dark:text-amber-400",
  "리스크": "text-rose-600 dark:text-rose-400",
  "의사결정": "text-blue-600 dark:text-blue-400",
  "외부": "text-violet-600 dark:text-violet-400",
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
              {/* 월 구분선 — 첫 번째 섹션 제외 */}
              {gi > 0 && <div className="h-px bg-border my-6" />}

              {/* 월 헤더 */}
              <h3 className="text-[13px] font-semibold mb-4">{group.label}</h3>

              {/* 항목 리스트 */}
              <div className="space-y-3">
                {group.items.map((m, i) => {
                  const isHighlight = m.isHighlight || HIGHLIGHT_CATEGORIES.has(m.category);
                  const label = CATEGORY_LABEL[m.category] || m.category;
                  const categoryColor = CATEGORY_COLOR[m.category] || "";

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
                  const hasSub = !!(mainSummary || followUp);

                  return (
                    <div key={`${group.monthKey}-${i}`} className={`flex gap-3 ${hasSub ? "pb-1" : ""}`}>
                      {/* 날짜 */}
                      <span className="text-[13px] tabular-nums text-muted-foreground/60 w-[34px] shrink-0 pt-[1px]">
                        {formatDate(m.date)}
                      </span>

                      {/* 콘텐츠 */}
                      <div className="min-w-0 flex-1">
                        {/* 첫 줄: 카테고리 · 제목 */}
                        <p className="text-[13px] leading-relaxed">
                          <span className={isHighlight && categoryColor ? `font-medium ${categoryColor}` : "text-muted-foreground"}>
                            {label}
                          </span>
                          <span className="text-muted-foreground/30 mx-1.5">·</span>
                          <span className={isHighlight ? "font-medium" : ""}>
                            {m.title}
                          </span>
                        </p>

                        {/* 둘째 줄: 요약 */}
                        {mainSummary && (
                          <p className="text-[12px] text-muted-foreground/50 leading-relaxed mt-0.5 line-clamp-1">
                            {mainSummary}
                          </p>
                        )}

                        {/* 셋째 줄: 후속 액션 */}
                        {followUp && (
                          <p className="text-[12px] text-muted-foreground/40 leading-relaxed mt-0.5 line-clamp-1">
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
