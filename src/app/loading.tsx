export default function HomeLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 animate-pulse">
      {/* 검색 바 */}
      <div className="mb-8 space-y-2">
        <div className="h-8 w-64 rounded bg-muted" />
        <div className="h-10 w-full rounded-lg bg-muted" />
      </div>

      {/* 기업 카드 그리드 */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-36 rounded-lg bg-muted" />
        ))}
      </div>

      {/* 최근 분석 */}
      <div className="mt-10 space-y-4">
        <div className="h-6 w-40 rounded bg-muted" />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="h-28 rounded-lg bg-muted" />
          <div className="h-28 rounded-lg bg-muted" />
        </div>
      </div>
    </div>
  );
}
