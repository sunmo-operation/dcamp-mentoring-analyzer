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
