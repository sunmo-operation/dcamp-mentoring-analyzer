"use client";

import { useEffect } from "react";
import Link from "next/link";

// 기업 상세 페이지 전용 에러 바운더리
export default function CompanyError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // 에러 상세 로그 (브라우저 콘솔에서 확인 가능)
  useEffect(() => {
    console.error("[CompanyError] 에러 상세:", {
      name: error.name,
      message: error.message,
      digest: error.digest,
      stack: error.stack,
    });
  }, [error]);

  // React 에러 #310 여부 확인
  const isReactChildError =
    error.message?.includes("#310") ||
    error.message?.includes("Objects are not valid as a React child");

  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <h2 className="text-xl font-bold tracking-tight mb-2">
        기업 정보를 불러올 수 없습니다
      </h2>
      <p className="text-sm text-muted-foreground mb-4">
        {isReactChildError
          ? "데이터 형식 오류가 발생했습니다. 새로고침하면 해결될 수 있습니다."
          : error.message || "데이터를 가져오는 중 오류가 발생했습니다."}
      </p>

      {/* 디버깅용 상세 정보 (접기/펴기) */}
      <details className="mb-6 text-left">
        <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
          에러 상세 (디버깅용)
        </summary>
        <pre className="mt-2 rounded-lg bg-muted p-3 text-xs text-muted-foreground overflow-auto max-h-48 whitespace-pre-wrap break-all">
          {JSON.stringify(
            {
              name: error.name,
              message: error.message,
              digest: error.digest,
            },
            null,
            2
          )}
        </pre>
      </details>

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
