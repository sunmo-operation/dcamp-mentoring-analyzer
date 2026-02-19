"use client";

import { Button } from "@/components/ui/button";

interface RefreshBarProps {
  loading: boolean;
  briefing: boolean;
  isStale: boolean;
  staleReason?: string;
  onRefresh: (force: boolean) => void;
  createdAt?: string;
}

// ── 갱신 컨트롤 바 ──────────────────────────────
export function RefreshBar({
  loading,
  briefing,
  isStale,
  staleReason,
  onRefresh,
  createdAt,
}: RefreshBarProps) {
  if (!briefing) return null;

  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-sm font-medium text-blue-600 dark:text-blue-400 animate-pulse">
                브리핑 갱신 중...
              </span>
            </div>
          ) : isStale ? (
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-yellow-500" />
              <span className="text-sm text-yellow-700 dark:text-yellow-300">
                {staleReason || "브리핑이 최신이 아닙니다"}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-xs text-muted-foreground">
                {createdAt && `${new Date(createdAt).toLocaleString("ko-KR")} 갱신`}
              </span>
            </div>
          )}
        </div>
        <Button
          variant={isStale ? "default" : "outline"}
          size="sm"
          onClick={() => onRefresh(true)}
          disabled={loading}
          className="shrink-0"
        >
          {loading ? (
            <span className="flex items-center gap-1.5">
              <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              갱신 중
            </span>
          ) : isStale ? (
            "브리핑 갱신"
          ) : (
            "갱신"
          )}
        </Button>
      </div>
    </div>
  );
}
