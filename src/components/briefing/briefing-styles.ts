// ── 브리핑 패널 공통 스타일 상수 및 유틸리티 ──────────────

// ── 모멘텀 뱃지 스타일 ────────────────────────────
export const momentumStyle: Record<string, { bg: string; label: string }> = {
  positive: { bg: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200", label: "상승세" },
  neutral: { bg: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200", label: "보합" },
  negative: { bg: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200", label: "하락세" },
  critical: { bg: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200", label: "위기" },
};

// ── 인사이트 카테고리 색상 (9개 비즈니스 카테고리 + 이전 호환) ──
export const categoryStyle: Record<string, string> = {
  // 새 카테고리 (비즈니스 기능 중심)
  "전략": "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  "마케팅": "bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200",
  "영업": "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
  "제품": "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
  "기술": "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
  "HR·조직": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  "재무": "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200",
  "운영": "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  "멘토링": "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  // 이전 호환용 (기존 브리핑에서 사용된 카테고리)
  "조직": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  "실행": "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  "시장": "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
};

// ── 경쟁 위협도 스타일 ────────────────────────────
export const threatStyle: Record<string, { bg: string; label: string }> = {
  high: { bg: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200", label: "높은 위협" },
  medium: { bg: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200", label: "보통" },
  low: { bg: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200", label: "낮음" },
};

// ── 법령/정책 타입 스타일 ────────────────────────────
export const policyTypeStyle: Record<string, string> = {
  "법령": "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  "지원사업": "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  "정책": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  "업계소식": "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
};

export const urgencyLabel: Record<string, string> = {
  high: "긴급",
  medium: "주의",
  low: "참고",
};

// ── 개조식 텍스트를 라인 배열로 파싱 ─────────────────
// Claude가 다양한 불릿/구분자를 사용하므로 모두 처리
export function parseBulletLines(text: string | undefined | null): string[] {
  if (!text) return [];

  // 1차: \n으로 분리
  let lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  // \n이 1줄뿐이고 " / " 구분자가 있으면 → 슬래시로 재분리
  if (lines.length <= 1 && text.includes(" / ")) {
    lines = text.split(" / ").map((l) => l.trim()).filter(Boolean);
  }

  // (1), (2) 등 번호 패턴이 한 줄에 여러 개면 → 번호 기준 재분리
  if (lines.length <= 1 && /\(\d+\)/.test(text)) {
    lines = text.split(/(?=\(\d+\))/).map((l) => l.trim()).filter(Boolean);
  }

  return lines.map((line) =>
    line
      .replace(/^[\s]*[•▪▸►·‣⁃\-\*]\s*/, "")  // 불릿 기호 제거
      .replace(/^\d+[.)]\s*/, "")                 // 번호 목록 제거 (1. 2) 등)
      .trim()
  ).filter(Boolean);
}
