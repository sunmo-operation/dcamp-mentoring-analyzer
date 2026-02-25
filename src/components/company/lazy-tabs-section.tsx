"use client";

import { useState, useCallback, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { CompanyTabs } from "./company-tabs";
import { PulseTab } from "@/components/pulse/pulse-tab";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  MentoringSession,
  ExpertRequest,
  AnalysisResult,
} from "@/types";
import type { PulseReport } from "@/lib/agents/types";

// 세션 유형별 아이콘
const SESSION_TYPE_ICON: Record<string, string> = {
  "\uBA58\uD1A0": "\u{1F468}\u{200D}\u{1F3EB}",
  "\uC804\uBB38\uAC00\uD22C\uC785": "\u{1F393}",
  "\uC810\uAC80": "\u{1F50D}",
  "\uCCB4\uD06C\uC5C5": "\u{1F50D}",
  "\uD68C\uACE0": "\u{1F4CB}",
};

interface CompanyDetailData {
  sessions: MentoringSession[];
  expertRequests: ExpertRequest[];
  analyses: AnalysisResult[];
  expertSummary: { total: number; inProgress: number; completed: number };
  kptSummary?: string | null;
  kptCount?: number | null;
  pulse: PulseReport;
}

interface LazyTabsSectionProps {
  companyId: string;
}

export function LazyTabsSection({ companyId }: LazyTabsSectionProps) {
  // URL 파라미터를 클라이언트에서 읽어 ISR 캐시 보존
  const searchParams = useSearchParams();
  const filter = searchParams.get("filter") ?? undefined;
  const tab = searchParams.get("tab");
  const autoLoad = !!(filter || (tab && tab !== "mentoring"));

  const [data, setData] = useState<CompanyDetailData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/company-detail/${companyId}`);
      if (!res.ok) throw new Error(`${res.status}`);
      const json = await res.json();
      setData(json);
    } catch {
      setError("데이터를 불러오는 데 실패했습니다. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  // URL에 tab/filter가 있으면 자동 로드
  useEffect(() => {
    if (autoLoad && !data && !loading) {
      loadData();
    }
  }, [autoLoad, data, loading, loadData]);

  // ── 초기 상태: 버튼 표시 ────────────────────────
  if (!data && !loading && !error) {
    return (
      <div className="flex flex-col items-center gap-4 py-16">
        <div className="rounded-2xl bg-muted/50 px-6 py-3 text-center">
          <p className="text-sm text-muted-foreground">
            멘토링 기록, 팀 펄스
          </p>
        </div>
        <button
          onClick={loadData}
          className="inline-flex items-center gap-2 rounded-2xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-all duration-200 hover:bg-primary/90 hover:-translate-y-0.5 hover:shadow-lg"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 9l-7 7-7-7"
            />
          </svg>
          상세 기록 불러오기
        </button>
      </div>
    );
  }

  // ── 로딩 상태 ─────────────────────────────────
  if (loading && !data) {
    return (
      <div className="space-y-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="flex gap-4 border-b pb-2">
            <div className="h-8 w-24 rounded bg-muted" />
            <div className="h-8 w-24 rounded bg-muted" />
            <div className="h-8 w-24 rounded bg-muted" />
          </div>
          <div className="space-y-4">
            <div className="h-24 rounded-lg bg-muted" />
            <div className="h-24 rounded-lg bg-muted" />
          </div>
        </div>
        <p className="text-center text-sm text-muted-foreground animate-pulse">
          Notion에서 멘토링 기록을 불러오는 중...
        </p>
      </div>
    );
  }

  // ── 에러 상태 ─────────────────────────────────
  if (error && !data) {
    return (
      <div className="flex flex-col items-center gap-3 py-12">
        <p className="text-sm text-destructive">{error}</p>
        <button
          onClick={loadData}
          className="rounded-xl bg-muted px-4 py-2 text-sm font-medium transition-colors hover:bg-muted/80"
        >
          다시 시도
        </button>
      </div>
    );
  }

  // ── 데이터 로드 완료: 탭 렌더링 ──────────────
  const { sessions, pulse } = data!;

  // 멘토링 기록 탭
  const sortedSessions = [...sessions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const mentoringContent = (
    <>
      <div className="mb-6">
        <h2 className="text-xl font-bold">멘토링 기록</h2>
        <p className="text-sm text-muted-foreground">
          총 {sessions.length}건의 세션 기록
        </p>
      </div>
      {sortedSessions.length > 0 ? (
        <div className="space-y-4">
          {sortedSessions.map((session) => {
            const types = Array.isArray(session.sessionTypes)
              ? session.sessionTypes
              : [];
            const icon =
              types
                .map((t) => SESSION_TYPE_ICON[String(t)])
                .find(Boolean) || "\u{1F4AC}";
            const title =
              typeof session.title === "string"
                ? session.title
                : String(session.title || "");
            const summary =
              typeof session.summary === "string" ? session.summary : "";
            const followUp =
              typeof session.followUp === "string" ? session.followUp : "";
            const dateStr = session.date
              ? new Date(session.date).toLocaleDateString("ko-KR")
              : "-";

            return (
              <Card key={session.notionPageId}>
                <CardHeader className="pb-2 pt-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-lg shrink-0">{icon}</span>
                      <CardTitle className="text-base truncate">
                        {title}
                      </CardTitle>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {types.map((type) => (
                        <Badge
                          key={String(type)}
                          variant="outline"
                          className="text-xs"
                        >
                          {String(type)}
                        </Badge>
                      ))}
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {dateStr}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 pb-4 space-y-3">
                  {summary && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-1">
                        회의 내용
                      </p>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {summary}
                      </p>
                    </div>
                  )}
                  {followUp && (
                    <div className="rounded-2xl bg-muted/50 p-4">
                      <p className="text-xs font-semibold text-muted-foreground mb-1">
                        후속 조치
                      </p>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {followUp}
                      </p>
                    </div>
                  )}
                  {!summary && !followUp && (
                    <p className="text-sm text-muted-foreground">
                      기록된 내용 없음
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <p className="text-muted-foreground text-center py-8">
          멘토링 기록이 없습니다
        </p>
      )}
    </>
  );

  // 팀 펄스 탭
  const pulseContent = <PulseTab pulse={pulse} />;

  return (
    <CompanyTabs
      mentoringTab={mentoringContent}
      pulseTab={pulseContent}
    />
  );
}
