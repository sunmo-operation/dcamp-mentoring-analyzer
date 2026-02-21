"use client";

import Link from "next/link";

// 분석 페이지 에러 바운더리
export default function AnalyzeError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <h2 className="text-xl font-bold tracking-tight mb-2">
        분석 중 오류가 발생했습니다
      </h2>
      <p className="text-sm text-muted-foreground mb-6">
        {error.message || "잠시 후 다시 시도해주세요."}
      </p>
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={reset}
          className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:bg-[#1B6EF3]"
        >
          다시 시도
        </button>
        <Link
          href="/"
          className="rounded-xl border px-5 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted"
        >
          홈으로
        </Link>
      </div>
    </div>
  );
}
