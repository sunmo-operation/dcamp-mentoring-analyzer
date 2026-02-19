import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * API 엔드포인트 기본 인증 미들웨어
 *
 * - API_SECRET 환경변수가 설정된 경우: Authorization 헤더 또는 x-api-key 검증
 * - 미설정 시: 인증 없이 통과 (개발 모드 호환)
 * - 페이지 라우트 (/companies, /analyze 등)에는 적용되지 않음
 */
export function middleware(request: NextRequest) {
  // API 라우트만 보호
  if (!request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const apiSecret = process.env.API_SECRET;

  // API_SECRET 미설정 시 인증 건너뜀 (개발 환경)
  if (!apiSecret) {
    return NextResponse.next();
  }

  // Authorization: Bearer <token> 또는 x-api-key 헤더 확인
  const authHeader = request.headers.get("authorization");
  const apiKeyHeader = request.headers.get("x-api-key");

  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : apiKeyHeader;

  if (token !== apiSecret) {
    return NextResponse.json(
      { success: false, error: "인증이 필요합니다" },
      { status: 401 }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
