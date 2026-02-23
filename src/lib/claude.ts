import Anthropic from "@anthropic-ai/sdk";

// 서버 사이드에서만 호출됨 (API 키 보호)
export function getClaudeClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY?.replace(/\s+/g, "");
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY 환경변수가 설정되지 않았습니다. .env.local 파일을 확인하세요."
    );
  }
  return new Anthropic({ apiKey });
}

/**
 * Anthropic API 에러를 사용자 친화적 메시지로 분류
 * 모든 API 라우트에서 공통으로 사용
 */
export function classifyClaudeError(error: unknown): string {
  const msg = error instanceof Error ? error.message : String(error);

  // 크레딧/결제 문제
  if (/credit|balance|billing|purchase credits/i.test(msg)) {
    return "API 크레딧이 소진되었습니다. Anthropic 콘솔에서 크레딧을 충전해주세요.";
  }

  // API 키/인증 문제
  if (/API_KEY|API key|apiKey|authentication|unauthorized|401/i.test(msg)) {
    return "ANTHROPIC_API_KEY가 설정되지 않았거나 유효하지 않습니다.";
  }

  // 과부하/속도 제한
  if (/overloaded|529|rate|429/i.test(msg)) {
    return "AI 서버가 바쁩니다. 잠시 후 다시 시도해주세요.";
  }

  // 타임아웃/네트워크
  if (/timeout|ETIMEDOUT|ECONNRESET/i.test(msg)) {
    return "AI 서버 응답 시간 초과. 다시 시도해주세요.";
  }

  // JSON 파싱/포맷 문제
  if (/JSON|parse|PARSE|FORMAT|형식/i.test(msg)) {
    return "AI 응답을 처리하지 못했습니다. 다시 시도해주세요.";
  }

  // 기본값: 원본 에러 메시지 일부 포함
  const short = msg.length > 80 ? msg.slice(0, 80) + "…" : msg;
  return `오류가 발생했습니다: ${short}`;
}
