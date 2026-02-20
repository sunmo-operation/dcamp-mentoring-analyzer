import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function CompanyLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 animate-pulse">
      {/* 뒤로가기 */}
      <div className="mb-4 h-4 w-16 rounded bg-muted" />

      {/* 기업 프로필 스켈레톤 */}
      <Card className="mb-8">
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
        </div>
      </Card>

      {/* AI 브리핑 스켈레톤 */}
      <div className="mb-8 space-y-4">
        <div className="h-6 w-44 rounded bg-muted" />
        <div className="h-32 rounded-lg bg-muted" />
      </div>

      <Separator className="my-8" />

      {/* 탭 스켈레톤 */}
      <div className="space-y-4">
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
    </div>
  );
}
