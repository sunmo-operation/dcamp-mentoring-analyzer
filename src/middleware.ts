import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/auth";
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

// ── 인증이 필요 없는 경로 ──────────
const PUBLIC_PATHS = ["/login", "/api/auth"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
}

/**
 * 미들웨어 — next-auth v5 auth() 래퍼 사용
 *
 * 인증 우선순위:
 * 1. NextAuth 세션 (Google OAuth @dcamp.kr) — req.auth로 확인
 * 2. SITE_PASSWORD 쿠키 (폴백)
 * 둘 중 하나라도 유효하면 통과
 */
export default auth(async (req) => {
  const { pathname } = req.nextUrl;

  // ── 공개 경로는 인증 건너뜀 ─────────────────────
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // ── 1) NextAuth 세션 확인 (req.auth) ──────────────
  if (req.auth) {
    return handleApiProtection(req, pathname);
  }

  // ── 2) SITE_PASSWORD 쿠키 폴백 ─────────────────
  const sitePassword = process.env.SITE_PASSWORD;

  if (sitePassword) {
    const token = req.cookies.get(AUTH_COOKIE_NAME)?.value;
    const isValid = token ? await verifyAuthToken(token, sitePassword) : false;

    if (isValid) {
      return handleApiProtection(req, pathname);
    }
  }

  // ── 둘 다 실패 → 로그인으로 리다이렉트 ────────────
  // SITE_PASSWORD가 미설정이면 인증 불필요 (개발 환경)
  if (!sitePassword) {
    return handleApiProtection(req, pathname);
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      { success: false, error: "인증이 필요합니다" },
      { status: 401 },
    );
  }

  const loginUrl = new URL("/login", req.url);
  loginUrl.searchParams.set("from", pathname);
  return NextResponse.redirect(loginUrl);
});

/** API 전용 보호 (Rate Limiting + API_SECRET) */
function handleApiProtection(request: NextRequest, pathname: string) {
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

  if (!apiSecret) {
    return NextResponse.next();
  }

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
