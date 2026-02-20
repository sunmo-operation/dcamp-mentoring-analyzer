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
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-blue-600 dark:text-blue-400">&#9432;</span>
            <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
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
      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900 dark:bg-yellow-950">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-yellow-600 dark:text-yellow-400">&#9888;</span>
            <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
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
