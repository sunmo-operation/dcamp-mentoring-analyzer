import { Card } from "@/components/ui/card";

// 기업 프로필 스켈레톤 (Suspense fallback용)
export function ProfileSkeleton() {
  return (
    <Card className="animate-pulse">
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-4">
          <div className="h-8 w-40 rounded bg-muted" />
          <div className="h-6 w-20 rounded-full bg-muted" />
        </div>
        <div className="h-4 w-3/4 rounded bg-muted" />
        <div className="flex gap-2">
          <div className="h-6 w-24 rounded-full bg-muted" />
          <div className="h-6 w-24 rounded-full bg-muted" />
          <div className="h-6 w-24 rounded-full bg-muted" />
        </div>
        <div className="h-20 rounded-xl bg-muted/50" />
      </div>
    </Card>
  );
}

// AI 브리핑 스켈레톤 (Suspense fallback용)
export function BriefingSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-6 w-44 rounded bg-muted" />
      <div className="h-32 rounded-2xl bg-muted" />
    </div>
  );
}

// 탭 콘텐츠 스켈레톤 (Suspense fallback용)
export function TabsSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="flex gap-4 border-b pb-2">
        <div className="h-8 w-24 rounded bg-muted" />
        <div className="h-8 w-24 rounded bg-muted" />
        <div className="h-8 w-24 rounded bg-muted" />
      </div>
      <div className="space-y-4">
        <div className="h-24 rounded-lg bg-muted" />
        <div className="h-24 rounded-lg bg-muted" />
        <div className="h-24 rounded-lg bg-muted" />
      </div>
    </div>
  );
}
