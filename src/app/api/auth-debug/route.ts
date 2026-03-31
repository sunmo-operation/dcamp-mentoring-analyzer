import { NextResponse } from "next/server";

// Google OIDC 디스커버리 + 환경변수를 직접 테스트하는 엔드포인트
export async function GET() {
  const results: Record<string, unknown> = {};

  // 1. 환경변수
  results.envVars = {
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID
      ? `${process.env.GOOGLE_CLIENT_ID.slice(0, 20)}... (${process.env.GOOGLE_CLIENT_ID.length}자)`
      : "MISSING",
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET
      ? `${process.env.GOOGLE_CLIENT_SECRET.slice(0, 8)}... (${process.env.GOOGLE_CLIENT_SECRET.length}자)`
      : "MISSING",
    AUTH_SECRET: process.env.AUTH_SECRET
      ? `${process.env.AUTH_SECRET.slice(0, 8)}... (${process.env.AUTH_SECRET.length}자)`
      : "MISSING",
    AUTH_URL: process.env.AUTH_URL ?? "NOT SET",
    VERCEL_URL: process.env.VERCEL_URL ?? "NOT SET",
  };

  // 2. Google OIDC 디스커버리 테스트
  try {
    const res = await fetch(
      "https://accounts.google.com/.well-known/openid-configuration"
    );
    const data = await res.json();
    results.googleOidc = {
      status: res.status,
      authorization_endpoint: data.authorization_endpoint,
      token_endpoint: data.token_endpoint,
    };
  } catch (e) {
    results.googleOidc = { error: String(e) };
  }

  // 3. NextAuth 초기화 + 실제 signin 시도
  try {
    const { handlers } = await import("@/auth");
    // signin/google 요청을 시뮬레이션
    const testUrl = `${process.env.AUTH_URL || `https://${process.env.VERCEL_URL}`}/api/auth/signin/google`;
    const testReq = new Request(testUrl, {
      method: "GET",
      headers: { host: process.env.VERCEL_URL || "localhost" },
    });

    try {
      const response = await handlers.GET(testReq);
      results.signinTest = {
        status: response.status,
        location: response.headers.get("location"),
        contentType: response.headers.get("content-type"),
      };
      // 에러 응답이면 본문도 읽기
      if (response.status >= 400) {
        try {
          const body = await response.text();
          results.signinBody = body.slice(0, 500);
        } catch {}
      }
    } catch (e) {
      results.signinTest = {
        error: String(e),
        stack: e instanceof Error ? e.stack?.split("\n").slice(0, 5) : undefined,
      };
    }
  } catch (e) {
    results.authImportError = String(e);
  }

  return NextResponse.json(results, { status: 200 });
}
