"use client";

import { Button } from "@/components/ui/button";

interface StaleIndicatorProps {
  isStale: boolean;
  staleReason?: string;
  hasBriefing: boolean;
  onRefresh: () => void;
  isLoading: boolean;
}

export function StaleIndicator({
  isStale,
  staleReason,
  hasBriefing,
  onRefresh,
  isLoading,
}: StaleIndicatorProps) {
  // 브리핑 없을 때: 첫 브리핑 생성 CTA
  if (!hasBriefing) {
    return (
      <div className="rounded-2xl border-0 bg-secondary p-5 dark:bg-secondary">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-primary text-lg">&#9432;</span>
            <span className="text-sm font-semibold text-primary dark:text-secondary-foreground">
              아직 AI 브리핑이 생성되지 않았습니다
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isLoading}
          >
            {isLoading ? "생성 중..." : "첫 브리핑 생성"}
          </Button>
        </div>
      </div>
    );
  }

  // stale일 때: 노란 배너
  if (isStale) {
    return (
      <div className="rounded-2xl border-0 bg-amber-50 p-5 dark:bg-amber-950">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-amber-600 dark:text-amber-400 text-lg">&#9888;</span>
            <span className="text-sm font-semibold text-amber-800 dark:text-amber-200">
              {staleReason || "브리핑이 최신이 아닙니다"}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isLoading}
          >
            {isLoading ? "갱신 중..." : "갱신"}
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
