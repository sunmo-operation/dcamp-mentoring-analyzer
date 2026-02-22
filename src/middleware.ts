import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";

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

// ── 사이트 비밀번호 인증이 필요 없는 경로 ──────────
const PUBLIC_PATHS = ["/login", "/api/auth/login"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
}

/**
 * 미들웨어
 *
 * 1. SITE_PASSWORD 설정 시: 쿠키 기반 사이트 전체 비밀번호 보호
 * 2. Rate Limiting: IP 기반 분당 20회 제한 (API만)
 * 3. API_SECRET 설정 시: Bearer/x-api-key 인증 (API만)
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── 사이트 비밀번호 보호 ─────────────────────
  const sitePassword = process.env.SITE_PASSWORD;

  if (sitePassword && !isPublicPath(pathname)) {
    const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
    const isValid = token ? await verifyAuthToken(token, sitePassword) : false;

    if (!isValid) {
      // API 요청이면 401 JSON, 페이지 요청이면 로그인으로 리다이렉트
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          { success: false, error: "인증이 필요합니다" },
          { status: 401 },
        );
      }
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // ── 이하 API 전용 보호 로직 ──────────────────
  if (!pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // ── Rate Limiting ──────────────────────────────
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  if (isRateLimited(ip)) {
    return NextResponse.json(
      {
        success: false,
        error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.",
      },
      { status: 429 },
    );
  }

  // ── API 인증 ───────────────────────────────────
  const apiSecret = process.env.API_SECRET;

  // API_SECRET 미설정 시 인증 건너뜀 (개발 환경)
  if (!apiSecret) {
    return NextResponse.next();
  }

  // Authorization: Bearer <token> 또는 x-api-key 헤더 확인
  const authHeader = request.headers.get("authorization");
  const apiKeyHeader = request.headers.get("x-api-key");

  const apiToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : apiKeyHeader;

  if (apiToken !== apiSecret) {
    return NextResponse.json(
      { success: false, error: "인증이 필요합니다" },
      { status: 401 },
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * 정적 파일과 Next.js 내부 경로를 제외한 모든 라우트를 매칭
     * - _next/static, _next/image, favicon.ico 등 제외
     */
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
