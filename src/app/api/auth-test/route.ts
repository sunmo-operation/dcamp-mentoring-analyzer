import { NextResponse } from "next/server";

export async function GET() {
  const checks: Record<string, unknown> = {
    hasAuthSecret: !!process.env.AUTH_SECRET,
    authSecretLength: process.env.AUTH_SECRET?.length ?? 0,
    hasClientId: !!process.env.GOOGLE_CLIENT_ID,
    hasClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
    authUrl: process.env.AUTH_URL ?? "(not set)",
    nodeEnv: process.env.NODE_ENV,
    vercel: process.env.VERCEL ?? "(not set)",
    vercelUrl: process.env.VERCEL_URL ?? "(not set)",
  };

  // NextAuth 초기화 테스트
  try {
    const { auth } = await import("@/auth");
    checks.authImport = "success";

    try {
      // handlers가 제대로 동작하는지 확인
      const { handlers } = await import("@/auth");
      checks.handlersImport = "success";
      checks.hasGET = typeof handlers.GET === "function";
      checks.hasPOST = typeof handlers.POST === "function";
    } catch (e) {
      checks.handlersError = String(e);
    }
  } catch (e) {
    checks.authImport = "failed";
    checks.authError = String(e);
    checks.authStack = e instanceof Error ? e.stack : undefined;
  }

  return NextResponse.json(checks);
}
