import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getCompanyAllData,
  getBriefingByCompany,
  isBriefingStale,
  getKptReviews,
  getOkrItems,
} from "@/lib/data";
import { CompanyProfile } from "@/components/company/company-profile";
import { CompanyTabs } from "@/components/company/company-tabs";
import { BriefingPanel } from "@/components/briefing/briefing-panel";
import { AnalysisCard } from "@/components/analysis/analysis-card";
import { TimelineTab } from "@/components/timeline/timeline-tab";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollToTop } from "@/components/scroll-to-top";
import { LiveRefreshGuard } from "@/components/live-refresh-guard";

// 항상 최신 데이터를 가져오도록 동적 렌더링
export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; filter?: string }>;
}

export default async function CompanyPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { filter } = await searchParams;

  // 통합 데이터 + 브리핑 + KPT/OKR 모두 병렬 fetch
  const [allData, existingBriefing, kptReviews, okrItems] = await Promise.all([
    getCompanyAllData(id),
    getBriefingByCompany(id),
    getKptReviews(id),
    getOkrItems(id),
  ]);
  if (!allData) notFound();

  const { company, sessions, expertRequests, timeline, analyses } = allData;
  let briefingIsStale = false;
  let briefingStaleReason: string | undefined;
  if (existingBriefing) {
    const { stale, reason } = isBriefingStale(existingBriefing, {
      sessions,
      expertRequests,
      analyses,
      kptCount: kptReviews.length,
      okrItemCount: okrItems.length,
    });
    briefingIsStale = stale;
    briefingStaleReason = reason;
  }

  // 전문가 요청 요약 카운트
  const expertSummary = {
    total: expertRequests.length,
    inProgress: expertRequests.filter((r) =>
      ["매칭 중", "검토 중", "일정 확정", "접수"].some((s) =>
        (r.status || "").includes(s)
      )
    ).length,
    completed: expertRequests.filter((r) =>
      ["진행 완료", "완료"].some((s) => (r.status || "").includes(s))
    ).length,
  };

  // ── 분석 히스토리 탭 콘텐츠 ─────────────────────
  const analysisContent = (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold">AI 분석 이력</h2>
          <p className="text-sm text-muted-foreground">
            총 {analyses.length}건의 멘토링 분석
          </p>
        </div>
        <Link
          href={`/analyze?companyId=${company.notionPageId}`}
          className="rounded-2xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all duration-200 hover:bg-[#1B6EF3] hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(49,130,246,0.3)]"
        >
          새 분석
        </Link>
      </div>
      {analyses.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {analyses.map((analysis) => (
            <AnalysisCard key={analysis.id} analysis={analysis} />
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground text-center py-8">
          아직 분석 결과가 없습니다
        </p>
      )}
    </>
  );

  // ── 멘토링 기록 탭 콘텐츠 ──────────────────────
  const sessionTypeIcon: Record<string, string> = {
    "멘토": "👨‍🏫",
    "전문가투입": "🎓",
    "점검": "🔍",
    "체크업": "🔍",
    "회고": "📋",
  };

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
            const icon = session.sessionTypes
              .map((t) => sessionTypeIcon[t])
              .find(Boolean) || "💬";
            return (
              <Card key={session.notionPageId}>
                <CardHeader className="pb-2 pt-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-lg shrink-0">{icon}</span>
                      <CardTitle className="text-base truncate">
                        {session.title}
                      </CardTitle>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {session.sessionTypes.map((type) => (
                        <Badge key={type} variant="outline" className="text-xs">
                          {type}
                        </Badge>
                      ))}
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(session.date).toLocaleDateString("ko-KR")}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 pb-4 space-y-3">
                  {/* 회의 내용 요약 */}
                  {session.summary && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-1">회의 내용</p>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {session.summary}
                      </p>
                    </div>
                  )}
                  {/* 후속 조치 */}
                  {session.followUp && (
                    <div className="rounded-2xl bg-muted/50 p-4">
                      <p className="text-xs font-semibold text-muted-foreground mb-1">후속 조치</p>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {session.followUp}
                      </p>
                    </div>
                  )}
                  {/* 요약도 후속조치도 없는 경우 */}
                  {!session.summary && !session.followUp && (
                    <p className="text-sm text-muted-foreground">기록된 내용 없음</p>
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

  // ── 타임라인 탭 콘텐츠 ────────────────────────
  const timelineContent = (
    <>
      <div className="mb-6">
        <h2 className="text-xl font-bold">타임라인</h2>
        <p className="text-sm text-muted-foreground">
          회의록 + 전문가 요청 통합 ({timeline.length}건)
        </p>
      </div>
      <TimelineTab
        events={timeline}
        expertRequests={expertRequests}
        initialFilter={filter}
      />
    </>
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* 페이지 진입 시 최상단으로 스크롤 */}
      <ScrollToTop />
      {/* 60초마다 Notion 변경 감지 → 자동 갱신 */}
      <LiveRefreshGuard scope="company-detail" companyId={id} />
      {/* 뒤로가기 */}
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-sm text-muted-foreground transition-all duration-200 hover:bg-muted hover:text-foreground"
      >
        &larr; 홈으로
      </Link>

      {/* 기업 프로필 */}
      <CompanyProfile company={company} expertSummary={expertSummary} />

      {/* AI 컨텍스트 브리핑 */}
      <div className="my-8">
        <BriefingPanel
          companyId={id}
          companyName={company.name}
          initialBriefing={existingBriefing}
          isStale={briefingIsStale}
          staleReason={briefingStaleReason}
        />
      </div>

      <Separator className="my-8" />

      {/* 탭 시스템 (근거 데이터) */}
      <Suspense fallback={<div className="py-8 text-center text-muted-foreground">로딩 중...</div>}>
        <CompanyTabs
          mentoringTab={mentoringContent}
          timelineTab={timelineContent}
          analysisTab={analysisContent}
        />
      </Suspense>
    </div>
  );
}
