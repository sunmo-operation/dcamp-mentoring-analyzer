import { NextResponse } from "next/server";
import { createAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";

export async function POST(request: Request) {
  const sitePassword = process.env.SITE_PASSWORD;

  if (!sitePassword) {
    return NextResponse.json(
      { success: false, error: "비밀번호 보호가 설정되지 않았습니다" },
      { status: 400 },
    );
  }

  const body = await request.json().catch(() => null);
  const password = body?.password;

  if (!password || password !== sitePassword) {
    return NextResponse.json(
      { success: false, error: "비밀번호가 올바르지 않습니다" },
      { status: 401 },
    );
  }

  const token = await createAuthToken(sitePassword);
  const response = NextResponse.json({ success: true });

  response.cookies.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7일
  });

  return response;
}
