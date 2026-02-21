import { Suspense, cache } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getCompanyAllData,
  getBriefingByCompany,
  isBriefingStale,
  getKptReviews,
  getOkrItems,
  summarizeRecentKpt,
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
import { sanitizeForReact } from "@/lib/safe-render";
import {
  ProfileSkeleton,
  BriefingSkeleton,
  TabsSkeleton,
} from "@/components/company/company-skeletons";

// ISR: 2분간 캐시된 HTML 즉시 반환, 이후 백그라운드 재생성
// LiveRefreshGuard가 60초마다 freshness 체크하므로 데이터 신선도 보장
export const revalidate = 120;
export const maxDuration = 120;

// ── React cache: 같은 요청 내 동일 함수 호출 중복 제거 ──
// 3개 Suspense 섹션이 병렬로 같은 데이터를 요청해도 실제 Notion API는 1번만 호출
const cachedGetAllData = cache(getCompanyAllData);
const cachedGetKptReviews = cache(getKptReviews);
const cachedGetOkrItems = cache(getOkrItems);
const cachedGetBriefing = cache(getBriefingByCompany);

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; filter?: string }>;
}

// ══════════════════════════════════════════════════
// 메인 페이지: 쉘(뒤로가기, 레이아웃)만 즉시 렌더링
// 각 섹션은 독립 Suspense 경계에서 병렬 스트리밍
// ══════════════════════════════════════════════════
export default async function CompanyPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { filter } = await searchParams;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* 즉시 렌더링 — 페이지 쉘 */}
      <ScrollToTop />
      <LiveRefreshGuard scope="company-detail" companyId={id} />
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-sm text-muted-foreground transition-all duration-200 hover:bg-muted hover:text-foreground"
      >
        &larr; 홈으로
      </Link>

      {/* 스트리밍 섹션 1: 기업 프로필 + KPT 요약 */}
      <Suspense fallback={<ProfileSkeleton />}>
        <ProfileSection companyId={id} />
      </Suspense>

      {/* 스트리밍 섹션 2: AI 컨텍스트 브리핑 */}
      <div className="my-8">
        <Suspense fallback={<BriefingSkeleton />}>
          <BriefingSection companyId={id} />
        </Suspense>
      </div>

      <Separator className="my-8" />

      {/* 스트리밍 섹션 3: 탭 (멘토링 + 타임라인 + 분석) */}
      <Suspense fallback={<TabsSkeleton />}>
        <TabsSection companyId={id} filter={filter} />
      </Suspense>
    </div>
  );
}

// ══════════════════════════════════════════════════
// 섹션 1: 기업 프로필 + KPT 요약
// ══════════════════════════════════════════════════
async function ProfileSection({ companyId }: { companyId: string }) {
  // allData + kptReviews 병렬 fetch (cache로 다른 섹션과 중복 방지)
  const [allData, kptReviews] = await Promise.all([
    cachedGetAllData(companyId),
    cachedGetKptReviews(companyId),
  ]);
  if (!allData) notFound();

  const { company, expertRequests } = allData;

  // KPT AI 요약 (자체 30분 캐시 보유)
  const kptResult = await summarizeRecentKpt(companyId, kptReviews);

  // 전문가 요청 요약
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

  return (
    <CompanyProfile
      company={company}
      expertSummary={expertSummary}
      kptSummary={kptResult?.summary}
      kptCount={kptResult?.count}
    />
  );
}

// ══════════════════════════════════════════════════
// 섹션 2: AI 브리핑 패널
// ══════════════════════════════════════════════════
async function BriefingSection({ companyId }: { companyId: string }) {
  const [allData, existingBriefing, kptReviews, okrItems] = await Promise.all([
    cachedGetAllData(companyId),
    cachedGetBriefing(companyId),
    cachedGetKptReviews(companyId),
    cachedGetOkrItems(companyId),
  ]);
  if (!allData) return null;

  const { company, sessions, expertRequests, analyses } = allData;

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

  return (
    <BriefingPanel
      companyId={companyId}
      companyName={company.name}
      initialBriefing={existingBriefing ? sanitizeForReact(existingBriefing) : undefined}
      isStale={briefingIsStale}
      staleReason={briefingStaleReason}
    />
  );
}

// ══════════════════════════════════════════════════
// 섹션 3: 탭 (멘토링 기록 + 타임라인 + AI 분석)
// ══════════════════════════════════════════════════
const SESSION_TYPE_ICON: Record<string, string> = {
  "멘토": "\u{1F468}\u{200D}\u{1F3EB}",
  "전문가투입": "\u{1F393}",
  "점검": "\u{1F50D}",
  "체크업": "\u{1F50D}",
  "회고": "\u{1F4CB}",
};

async function TabsSection({
  companyId,
  filter,
}: {
  companyId: string;
  filter?: string;
}) {
  const allData = await cachedGetAllData(companyId);
  if (!allData) return null;

  const { sessions, expertRequests, timeline, analyses } = allData;

  // ── 분석 히스토리 탭 콘텐츠 ─────────────────────
  const analysisContent = (
    <>
      <div className="mb-6">
        <h2 className="text-xl font-bold">AI 분석 이력</h2>
        <p className="text-sm text-muted-foreground">
          총 {analyses.length}건의 멘토링 분석
        </p>
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
            const types = Array.isArray(session.sessionTypes) ? session.sessionTypes : [];
            const icon = types
              .map((t) => SESSION_TYPE_ICON[String(t)])
              .find(Boolean) || "\u{1F4AC}";
            const title = typeof session.title === "string" ? session.title : String(session.title || "");
            const summary = typeof session.summary === "string" ? session.summary : "";
            const followUp = typeof session.followUp === "string" ? session.followUp : "";
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
                        <Badge key={String(type)} variant="outline" className="text-xs">
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
                      <p className="text-xs font-semibold text-muted-foreground mb-1">회의 내용</p>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {summary}
                      </p>
                    </div>
                  )}
                  {followUp && (
                    <div className="rounded-2xl bg-muted/50 p-4">
                      <p className="text-xs font-semibold text-muted-foreground mb-1">후속 조치</p>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {followUp}
                      </p>
                    </div>
                  )}
                  {!summary && !followUp && (
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
    <CompanyTabs
      mentoringTab={mentoringContent}
      timelineTab={timelineContent}
      analysisTab={analysisContent}
    />
  );
}
