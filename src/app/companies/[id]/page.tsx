import { Suspense, cache } from "react";
import { unstable_cache } from "next/cache";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getCompanyLight,
  getBriefingByCompany,
} from "@/lib/data";
import { CompanyProfile } from "@/components/company/company-profile";
import { BriefingPanel } from "@/components/briefing/briefing-panel";
import { Separator } from "@/components/ui/separator";
import { ScrollToTop } from "@/components/scroll-to-top";
import { LiveRefreshGuard } from "@/components/live-refresh-guard";
import { sanitizeForReact } from "@/lib/safe-render";
import { LazyTabsSection } from "@/components/company/lazy-tabs-section";
import {
  ProfileSkeleton,
  BriefingSkeleton,
} from "@/components/company/company-skeletons";

// ISR: 5분간 캐시된 HTML 즉시 반환, 이후 백그라운드 재생성
export const revalidate = 300;
export const maxDuration = 120;

// ── unstable_cache: Vercel Data Cache에 명시적 등록 ──
// Notion SDK가 node-fetch를 사용하므로 Next.js가 자동 추적 불가
// unstable_cache로 감싸야 ISR 캐시(s-maxage)가 활성화됨
const persistedGetCompanyLight = unstable_cache(
  getCompanyLight,
  ["company-light"],
  { revalidate: 300 }
);
const persistedGetBriefing = unstable_cache(
  getBriefingByCompany,
  ["briefing"],
  { revalidate: 300 }
);

// ── React cache: 같은 요청 내 동일 함수 호출 중복 제거 ──
// ProfileSection과 BriefingSection이 동시에 호출해도 실제 1번만 실행
const cachedGetCompanyLight = cache(persistedGetCompanyLight);
const cachedGetBriefing = cache(persistedGetBriefing);

interface Props {
  params: Promise<{ id: string }>;
  // searchParams를 서버에서 읽지 않음 → ISR 캐시 활성화
  // tab/filter는 LazyTabsSection(클라이언트)에서 useSearchParams()로 읽음
}

// ══════════════════════════════════════════════════
// 메인 페이지: 쉘(뒤로가기, 레이아웃)만 즉시 렌더링
// 프로필 + 브리핑은 Suspense 스트리밍 (Notion 1회 + DB 1회)
// 멘토링 기록은 온디맨드 로드 (버튼 클릭 시)
// ══════════════════════════════════════════════════
export default async function CompanyPage({ params }: Props) {
  const { id } = await params;

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

      {/* 스트리밍 섹션 1: 기업 프로필 (경량 — Notion 1회 + 로컬 엑셀) */}
      <Suspense fallback={<ProfileSkeleton />}>
        <ProfileSection companyId={id} />
      </Suspense>

      {/* 스트리밍 섹션 2: AI 컨텍스트 브리핑 (DB 조회만 — Notion 미호출) */}
      <div className="my-8">
        <Suspense fallback={<BriefingSkeleton />}>
          <BriefingSection companyId={id} />
        </Suspense>
      </div>

      <Separator className="my-8" />

      {/* 온디맨드 섹션: 멘토링 기록 + 타임라인 + 분석 (버튼 클릭 시 로드) */}
      {/* tab/filter는 클라이언트에서 useSearchParams로 읽어 ISR 캐시 보존 */}
      <LazyTabsSection companyId={id} />
    </div>
  );
}

// ══════════════════════════════════════════════════
// 섹션 1: 기업 프로필 (경량 — Notion 1회 + 로컬 엑셀)
// 기존 getCompanyAllData (4 Notion calls) → getCompanyLight (1 Notion call)
// 전문가 요약, KPT 요약은 온디맨드 영역으로 이동
// ══════════════════════════════════════════════════
async function ProfileSection({ companyId }: { companyId: string }) {
  const t0 = Date.now();
  const company = await cachedGetCompanyLight(companyId);
  if (!company) notFound();
  console.log(`[perf] ProfileSection(light): ${Date.now() - t0}ms`);

  return <CompanyProfile company={company} />;
}

// ══════════════════════════════════════════════════
// 섹션 2: AI 브리핑 패널 (DB 조회만 — Notion 미호출)
// 기존: getCompanyAllData + getKptReviews + getOkrItems (7+ Notion calls)
// 변경: getCompanyLight (1 Notion call) + getBriefingByCompany (DB 1회)
// stale 체크: 시간 기반(24h)만 수행 (세션 건수 비교는 온디맨드 영역)
// ══════════════════════════════════════════════════
async function BriefingSection({ companyId }: { companyId: string }) {
  const t0 = Date.now();
  const [company, existingBriefing] = await Promise.all([
    cachedGetCompanyLight(companyId),
    cachedGetBriefing(companyId),
  ]);
  console.log(`[perf] BriefingSection(light): ${Date.now() - t0}ms`);
  if (!company) return null;

  // 시간 기반 stale 체크만 수행 (세션/전문가 건수는 온디맨드 영역)
  let briefingIsStale = false;
  let briefingStaleReason: string | undefined;
  if (existingBriefing) {
    const hoursSince =
      (Date.now() - new Date(existingBriefing.createdAt).getTime()) /
      (1000 * 60 * 60);
    if (hoursSince > 24) {
      briefingIsStale = true;
      briefingStaleReason = "마지막 브리핑 생성 후 24시간 이상 경과";
    }
  }

  return (
    <BriefingPanel
      companyId={companyId}
      companyName={company.name}
      initialBriefing={
        existingBriefing ? sanitizeForReact(existingBriefing) : undefined
      }
      isStale={briefingIsStale}
      staleReason={briefingStaleReason}
    />
  );
}
