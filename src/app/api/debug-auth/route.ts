import { NextResponse } from "next/server";

export async function GET() {
  const checks = {
    GOOGLE_CLIENT_ID: !!process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: !!process.env.GOOGLE_CLIENT_SECRET,
    AUTH_SECRET: !!process.env.AUTH_SECRET,
    NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
    AUTH_URL: process.env.AUTH_URL ?? "(not set)",
    NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? "(not set)",
    AUTH_TRUST_HOST: process.env.AUTH_TRUST_HOST ?? "(not set)",
    NODE_ENV: process.env.NODE_ENV,
  };

  // NextAuth 초기화 테스트
  let authError: string | null = null;
  try {
    const { auth } = await import("@/auth");
    await auth();
  } catch (e) {
    authError = e instanceof Error ? e.message : String(e);
  }

  return NextResponse.json({ checks, authError });
}
