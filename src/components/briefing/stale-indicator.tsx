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
  // 브리핑 없을 때: 눈에 띄는 첫 브리핑 생성 CTA
  if (!hasBriefing) {
    return (
      <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 via-indigo-50/50 to-white p-6 dark:border-blue-800 dark:from-blue-950/40 dark:via-indigo-950/30 dark:to-gray-950">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 shadow-lg shadow-blue-500/20">
            <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
              AI 심층 브리핑을 생성해보세요
            </p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              멘토링 기록, KPT 회고, 전문가 투입 이력을 AI가 교차 분석하여 핵심 인사이트와 액션 아이템을 도출합니다
            </p>
            <Button
              size="sm"
              className="mt-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-md shadow-blue-500/20"
              onClick={onRefresh}
              disabled={isLoading}
            >
              {isLoading ? "생성 중..." : "브리핑 생성하기"}
            </Button>
          </div>
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
