"use client";

import { useState } from "react";
import type { PulseReport } from "@/lib/agents/types";

interface PulseTabProps {
  pulse: PulseReport;
}

// ── 카테고리 라벨 ────────────────────────────────
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

// 하이라이트(마일스톤) 카테고리
const HIGHLIGHT_CATEGORIES = new Set(["성과", "전환점", "리스크", "의사결정", "외부"]);

// ── 유틸 ──────────────────────────────────────────
function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return `${String(d.getMonth() + 1)}/${String(d.getDate())}`;
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
      {/* 헤더 */}
      <div className="mb-6">
        <h2 className="text-xl font-bold">배치 타임라인</h2>
        <p className="text-sm text-muted-foreground">
          {milestones.length > 0
            ? `총 ${milestones.length}건의 활동 기록`
            : "기록이 없습니다"}
        </p>
      </div>

      {/* 타임라인 */}
      {groups.length > 0 ? (
        <div className="space-y-6">
          {groups.map((group) => (
            <div key={group.monthKey}>
              {/* 월 구분선 */}
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xs font-semibold text-foreground/70">
                  {group.label}
                </span>
                <div className="h-px flex-1 bg-border" />
              </div>

              {/* 항목 */}
              <div className="space-y-0">
                {group.items.map((m, i) => {
                  const isHighlight = m.isHighlight || HIGHLIGHT_CATEGORIES.has(m.category);
                  const label = CATEGORY_LABEL[m.category] || m.category;

                  return (
                    <div
                      key={`${group.monthKey}-${i}`}
                      className={`flex gap-3 py-2.5 ${
                        i < group.items.length - 1 ? "border-b border-border/30" : ""
                      }`}
                    >
                      {/* 날짜 */}
                      <span className="text-xs tabular-nums text-muted-foreground w-10 shrink-0 pt-0.5 text-right">
                        {formatDate(m.date)}
                      </span>

                      {/* 콘텐츠 */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-1.5">
                          <span className={`text-xs shrink-0 ${
                            isHighlight
                              ? "font-semibold text-foreground"
                              : "text-muted-foreground"
                          }`}>
                            {label}
                          </span>
                          {m.source !== "노션" && m.source !== "멘토링" && (
                            <span className="text-[10px] text-muted-foreground/60">{m.source}</span>
                          )}
                        </div>
                        <p className={`text-sm leading-relaxed ${isHighlight ? "font-medium" : ""}`}>
                          {m.title}
                        </p>
                        {m.summary && (
                          <p className="text-sm text-muted-foreground mt-1 leading-relaxed whitespace-pre-line">
                            {m.summary}
                          </p>
                        )}
                        {isHighlight && m.detail && m.detail !== m.title && !m.summary?.includes(m.detail) && (
                          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                            {m.detail}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* 더 보기 */}
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
