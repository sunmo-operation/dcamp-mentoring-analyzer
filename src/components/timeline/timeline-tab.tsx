"use client";

import { useState } from "react";
import { TimelineCard } from "./timeline-card";
import type { TimelineEvent, ExpertRequest } from "@/types";

const FILTER_TABS = [
  { key: "all", label: "전체" },
  { key: "mentoring", label: "멘토링" },
  { key: "checkpoint", label: "점검" },
  { key: "expert_request", label: "전문가요청" },
] as const;

type FilterKey = (typeof FILTER_TABS)[number]["key"];

interface TimelineTabProps {
  events: TimelineEvent[];
  expertRequests: ExpertRequest[];
  /** URL에서 전달된 초기 필터 (expert_request 등) */
  initialFilter?: string;
}

export function TimelineTab({
  events,
  expertRequests,
  initialFilter,
}: TimelineTabProps) {
  const [filter, setFilter] = useState<FilterKey>(
    FILTER_TABS.some((t) => t.key === initialFilter)
      ? (initialFilter as FilterKey)
      : "all"
  );

  // expertRequest를 notionPageId 기준으로 맵 생성
  const expertMap = new Map(
    expertRequests.map((r) => [r.notionPageId, r])
  );

  const filtered =
    filter === "all"
      ? events
      : events.filter((e) => e.type === filter);

  return (
    <div>
      {/* 필터 탭 */}
      <div className="flex gap-1 mb-6 overflow-x-auto" role="group" aria-label="타임라인 필터">
        {FILTER_TABS.map((tab) => {
          const count =
            tab.key === "all"
              ? events.length
              : events.filter((e) => e.type === tab.key).length;
          return (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              aria-pressed={filter === tab.key}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                filter === tab.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {tab.label} ({count})
            </button>
          );
        })}
      </div>

      {/* 이벤트 목록 */}
      {filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map((event) => (
            <TimelineCard
              key={event.id}
              event={event}
              expertRequest={
                event.type === "expert_request"
                  ? expertMap.get(event.metadata.notionPageId || "")
                  : undefined
              }
            />
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground text-center py-8">
          해당 타입의 이벤트가 없습니다
        </p>
      )}
    </div>
  );
}
