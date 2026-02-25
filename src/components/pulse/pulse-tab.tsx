"use client";

import { useState } from "react";
import type { PulseReport } from "@/lib/agents/types";

interface PulseTabProps {
  pulse: PulseReport;
}

// 하이라이트 카테고리 (성과/전환/리스크 등 특별 이벤트)
const HIGHLIGHT_CATEGORIES = new Set(["성과", "전환점", "리스크", "의사결정", "외부"]);

// 카테고리 한글 라벨
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
        <div className="space-y-8">
          {groups.map((group) => (
            <section key={group.monthKey}>
              {/* 월 헤더 */}
              <div className="flex items-center gap-3 mb-4">
                <span className="text-sm font-semibold">{group.label}</span>
                <div className="h-px flex-1 bg-border" />
              </div>

              {/* 항목 */}
              <div className="space-y-4">
                {group.items.map((m, i) => {
                  const isHighlight = m.isHighlight || HIGHLIGHT_CATEGORIES.has(m.category);
                  const label = CATEGORY_LABEL[m.category] || m.category;
                  const hasSummary = !!(m.summary || (isHighlight && m.detail));

                  return (
                    <article
                      key={`${group.monthKey}-${i}`}
                      className={isHighlight
                        ? "border-l-2 border-foreground/30 pl-4 py-1"
                        : hasSummary ? "pl-4 py-1" : "pl-4"
                      }
                    >
                      {/* 첫 줄: 날짜 · 카테고리 · 제목 */}
                      <p className={`text-sm leading-relaxed ${isHighlight ? "font-semibold" : ""}`}>
                        <span className="text-muted-foreground tabular-nums">{formatDate(m.date)}</span>
                        <span className="text-muted-foreground mx-1.5">·</span>
                        <span className={isHighlight ? "text-foreground" : "text-muted-foreground"}>{label}</span>
                        <span className="text-muted-foreground mx-1.5">·</span>
                        <span className="text-foreground">{m.title}</span>
                      </p>

                      {/* 본문: 맥락 설명 */}
                      {m.summary && (
                        <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed whitespace-pre-line">
                          {m.summary}
                        </p>
                      )}
                      {isHighlight && m.detail && m.detail !== m.title && !m.summary?.includes(m.detail) && (
                        <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                          {m.detail}
                        </p>
                      )}
                    </article>
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
