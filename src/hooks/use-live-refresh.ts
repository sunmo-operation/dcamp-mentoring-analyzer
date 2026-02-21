"use client";

import { useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

interface UseLiveRefreshOptions {
  /** 프레시니스 체크 스코프 */
  scope: "companies" | "company-detail";
  /** company-detail 스코프일 때 기업 ID */
  companyId?: string;
  /** 폴링 주기 (ms). 기본 60초 */
  intervalMs?: number;
  /** 변경 감지 시 콜백 (기본: router.refresh) */
  onStale?: () => void;
}

/**
 * 노션 데이터 변경 감지 + 자동 갱신 훅
 *
 * 동작 방식:
 * 1. 주기적으로 /api/freshness를 호출 (경량: last_edited_time만 조회)
 * 2. 이전 값과 비교하여 변경 감지
 * 3. 변경 시 router.refresh() → 서버 컴포넌트 재렌더링 (클라이언트 상태 유지)
 * 4. 탭 복귀(focus) 시에도 즉시 체크
 */
export function useLiveRefresh({
  scope,
  companyId,
  intervalMs = 60_000,
  onStale,
}: UseLiveRefreshOptions) {
  const router = useRouter();
  const lastModifiedRef = useRef<string | null>(null);
  const isCheckingRef = useRef(false);

  const checkFreshness = useCallback(async () => {
    // 중복 체크 방지
    if (isCheckingRef.current) return;
    isCheckingRef.current = true;

    try {
      const params = new URLSearchParams({ scope });
      if (companyId) params.set("companyId", companyId);

      const res = await fetch(`/api/freshness?${params}`);
      if (!res.ok) return;

      const { lastModified } = await res.json();
      if (!lastModified) return;

      // 첫 체크: 기준값 저장만
      if (!lastModifiedRef.current) {
        lastModifiedRef.current = lastModified;
        return;
      }

      // 변경 감지: 새 데이터가 있으면 갱신 트리거
      if (lastModified !== lastModifiedRef.current) {
        lastModifiedRef.current = lastModified;
        if (onStale) {
          onStale();
        } else {
          // 기본: Next.js router.refresh() → RSC 재실행 (클라이언트 상태 유지)
          router.refresh();
        }
      }
    } catch {
      // 프레시니스 체크 실패는 조용히 무시 (UI 깨지지 않음)
    } finally {
      isCheckingRef.current = false;
    }
  }, [scope, companyId, router, onStale]);

  useEffect(() => {
    // 마운트 시 첫 체크
    checkFreshness();

    // 주기적 폴링
    const interval = setInterval(checkFreshness, intervalMs);

    // 탭 복귀 시 즉시 체크
    const handleFocus = () => checkFreshness();
    // 네트워크 복귀 시 체크
    const handleOnline = () => checkFreshness();

    window.addEventListener("focus", handleFocus);
    window.addEventListener("online", handleOnline);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("online", handleOnline);
    };
  }, [checkFreshness, intervalMs]);
}
