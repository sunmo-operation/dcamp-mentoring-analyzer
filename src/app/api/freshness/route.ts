import { NextRequest, NextResponse } from "next/server";
import { getLastEditedTime } from "@/lib/notion";

/**
 * 경량 프레시니스 체크 API
 * - Notion DB의 last_edited_time만 조회 (page_size=1, 최소 페이로드)
 * - 클라이언트가 주기적으로 폴링하여 변경 감지
 * - 변경 시에만 전체 데이터 리페치 트리거
 *
 * GET /api/freshness?scope=companies
 * GET /api/freshness?scope=company-detail&companyId=xxx
 */
export async function GET(request: NextRequest) {
  const scope = request.nextUrl.searchParams.get("scope") as
    | "companies"
    | "company-detail"
    | null;
  const companyId = request.nextUrl.searchParams.get("companyId") || undefined;

  if (!scope) {
    return NextResponse.json(
      { error: "scope 파라미터 필요 (companies | company-detail)" },
      { status: 400 }
    );
  }

  const lastModified = await getLastEditedTime(scope, companyId);

  return NextResponse.json(
    { lastModified, checkedAt: new Date().toISOString() },
    {
      headers: {
        // 프레시니스 체크는 항상 최신으로 — 캐시하지 않음
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    }
  );
}
