import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ── Rate Limiting (in-memory sliding window) ──────────
const RATE_LIMIT_WINDOW_MS = 60_000; // 1분
const RATE_LIMIT_MAX = 20; // 분당 최대 요청 수
const requestLog = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = requestLog.get(ip) ?? [];
  const recent = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  recent.push(now);
  requestLog.set(ip, recent);

  // 메모리 누수 방지: 오래된 IP 엔트리 정리 (1000개 초과 시)
  if (requestLog.size > 1000) {
    for (const [key, ts] of requestLog) {
      if (ts.every((t) => now - t >= RATE_LIMIT_WINDOW_MS)) {
        requestLog.delete(key);
      }
    }
  }

  return recent.length > RATE_LIMIT_MAX;
}

/**
 * API 엔드포인트 보호 미들웨어
 *
 * 1. Rate Limiting: IP 기반 분당 20회 제한 (Claude API 비용 폭주 방지)
 * 2. 인증: API_SECRET 환경변수 설정 시 Bearer/x-api-key 검증
 */
export function middleware(request: NextRequest) {
  // API 라우트만 보호
  if (!request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // ── Rate Limiting ──────────────────────────────
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "unknown";

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { success: false, error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
      { status: 429 }
    );
  }

  // ── 인증 ───────────────────────────────────────
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
