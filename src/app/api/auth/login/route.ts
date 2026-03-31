import { NextResponse } from "next/server";
import { createAuthToken, verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";

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

  // timing-safe 비교: 비밀번호가 다르더라도 동일한 시간 소요
  if (!password) {
    return NextResponse.json(
      { success: false, error: "비밀번호가 올바르지 않습니다" },
      { status: 401 },
    );
  }
  const inputToken = await createAuthToken(password);
  const expectedToken = await createAuthToken(sitePassword);
  const isValid = await verifyAuthToken(inputToken, sitePassword);
  // inputToken과 expectedToken이 같은지 최종 확인 (이중 검증)
  if (inputToken !== expectedToken || !isValid) {
    return NextResponse.json(
      { success: false, error: "비밀번호가 올바르지 않습니다" },
      { status: 401 },
    );
  }

  const token = await createAuthToken(sitePassword);
  const response = NextResponse.json({ success: true });

  response.cookies.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 2, // 2시간으로 단축
  });

  return response;
}
