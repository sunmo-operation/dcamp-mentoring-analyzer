/**
 * 사이트 비밀번호 인증 유틸리티
 *
 * Web Crypto API 기반 — Edge Runtime(middleware)에서도 동작
 * HMAC-SHA256 토큰 발급/검증, timing-safe 비교
 */

export const AUTH_COOKIE_NAME = "dcamp_auth";

// HMAC 서명에 사용할 고정 메시지
const HMAC_MESSAGE = "dcamp-site-auth";

/** 비밀번호로부터 HMAC-SHA256 토큰(hex 문자열) 생성 */
export async function createAuthToken(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(HMAC_MESSAGE),
  );
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** 토큰이 해당 비밀번호로 생성된 것인지 검증 (timing-safe) */
export async function verifyAuthToken(
  token: string,
  password: string,
): Promise<boolean> {
  const expected = await createAuthToken(password);

  // 길이가 다르면 false (길이 정보는 이미 공개적이므로 OK)
  if (token.length !== expected.length) return false;

  // timing-safe 비교: 모든 바이트를 항상 비교
  const a = new TextEncoder().encode(token);
  const b = new TextEncoder().encode(expected);
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}
