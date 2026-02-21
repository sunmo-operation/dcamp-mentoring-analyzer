"use client";

import { useLiveRefresh } from "@/hooks/use-live-refresh";

interface LiveRefreshGuardProps {
  /** 프레시니스 체크 스코프 */
  scope: "companies" | "company-detail";
  /** company-detail 스코프일 때 기업 ID */
  companyId?: string;
  /** 폴링 주기 (ms). 기본 60초 */
  intervalMs?: number;
}

/**
 * 투명한 라이브 데이터 동기화 컴포넌트
 *
 * 페이지에 삽입하면:
 * - 60초마다 Notion 데이터 변경 감지 (경량 API 호출)
 * - 탭 복귀 시 즉시 체크
 * - 변경 시 서버 컴포넌트 자동 재렌더링
 * - UI에 아무것도 렌더링하지 않음 (투명)
 */
export function LiveRefreshGuard({
  scope,
  companyId,
  intervalMs,
}: LiveRefreshGuardProps) {
  useLiveRefresh({ scope, companyId, intervalMs });
  return null;
}
