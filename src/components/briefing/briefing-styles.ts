// ── 브리핑 패널 공통 스타일 상수 및 유틸리티 ──────────────

// ── 모멘텀 뱃지 스타일 ────────────────────────────
export const momentumStyle: Record<string, { bg: string; label: string }> = {
  positive: { bg: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200", label: "상승세" },
  neutral: { bg: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200", label: "보합" },
  negative: { bg: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200", label: "하락세" },
  critical: { bg: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200", label: "위기" },
};

// ── 인사이트 카테고리 색상 ────────────────────────────
export const categoryStyle: Record<string, string> = {
  "전략": "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  "조직": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  "실행": "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  "시장": "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  "제품": "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
  "재무": "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200",
  "멘토링": "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
};

export const urgencyLabel: Record<string, string> = {
  high: "긴급",
  medium: "주의",
  low: "참고",
};

// ── 개조식 텍스트를 라인 배열로 파싱 ─────────────────
export function parseBulletLines(text: string | undefined | null): string[] {
  if (!text) return [];
  return text
    .split("\n")
    .map((line) => line.replace(/^[•\-\*]\s*/, "").trim())
    .filter(Boolean);
}
