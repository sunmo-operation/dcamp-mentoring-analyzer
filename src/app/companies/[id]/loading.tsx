import { Separator } from "@/components/ui/separator";
import {
  ProfileSkeleton,
  BriefingSkeleton,
  TabsSkeleton,
} from "@/components/company/company-skeletons";

// 라우트 전환 시 즉시 표시되는 전체 페이지 스켈레톤
// Next.js Link prefetch로 이 스켈레톤이 미리 캐시됨
export default function CompanyLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 animate-pulse">
      {/* 뒤로가기 */}
      <div className="mb-6 h-4 w-16 rounded bg-muted" />

      {/* 기업 프로필 */}
      <ProfileSkeleton />

      {/* AI 브리핑 */}
      <div className="my-8">
        <BriefingSkeleton />
      </div>

      <Separator className="my-8" />

      {/* 탭 */}
      <TabsSkeleton />
    </div>
  );
}
