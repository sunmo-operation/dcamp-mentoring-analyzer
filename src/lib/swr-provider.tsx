"use client";

import { SWRConfig } from "swr";
import type { ReactNode } from "react";

// 공통 fetcher: JSON API 호출
const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API 오류 (${res.status})`);
  return res.json();
};

/**
 * SWR 글로벌 설정 Provider
 * - revalidateOnFocus: 탭 복귀 시 자동 갱신
 * - dedupingInterval: 같은 키 중복 요청 방지 (30초)
 * - errorRetryCount: 에러 시 재시도 3회
 * - onErrorRetry: 404는 재시도하지 않음
 */
export function SWRProvider({ children }: { children: ReactNode }) {
  return (
    <SWRConfig
      value={{
        fetcher,
        revalidateOnFocus: true,
        revalidateOnReconnect: true,
        dedupingInterval: 30_000,
        errorRetryCount: 3,
        onErrorRetry: (error, _key, _config, revalidate, { retryCount }) => {
          // 404는 재시도하지 않음
          if (error?.status === 404) return;
          // 3회 이상 실패 시 중단
          if (retryCount >= 3) return;
          // 점진적 지연 후 재시도
          setTimeout(() => revalidate({ retryCount }), 2000 * (retryCount + 1));
        },
      }}
    >
      {children}
    </SWRConfig>
  );
}
