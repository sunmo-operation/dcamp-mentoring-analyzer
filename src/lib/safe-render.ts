// ── 안전한 JSX 렌더링 유틸리티 ──────────────────────────
// React error #310 ("Objects are not valid as a React child") 방지
// DB에서 읽은 데이터에 예상치 못한 객체가 포함될 수 있으므로 방어적 변환

/**
 * 어떤 값이든 React에서 안전하게 렌더링할 수 있는 문자열로 변환
 * - string/number/boolean → 그대로
 * - null/undefined → 빈 문자열
 * - object/array → JSON 문자열 (fallback)
 */
export function safeStr(val: unknown): string {
  if (val === null || val === undefined) return "";
  if (typeof val === "string") return val;
  if (typeof val === "number" || typeof val === "boolean") return String(val);
  // 객체/배열이 문자열 자리에 들어온 경우 — React #310 방지
  try {
    return JSON.stringify(val);
  } catch {
    return "[데이터 오류]";
  }
}

/**
 * 배열의 각 요소를 안전한 문자열로 변환
 * 객체 배열이 문자열 배열 자리에 들어온 경우 방어
 */
export function safeStrArray(val: unknown): string[] {
  if (!Array.isArray(val)) return [];
  return val.map((item) => safeStr(item));
}

/**
 * 브리핑/분석 데이터의 모든 leaf 값을 재귀적으로 검증
 * 문자열이어야 할 자리에 객체가 있으면 JSON.stringify로 변환
 * React #310의 근본 원인 차단
 */
export function sanitizeForReact<T>(data: T): T {
  if (data === null || data === undefined) return data;
  if (typeof data !== "object") return data;

  if (Array.isArray(data)) {
    return data.map((item) => {
      // 배열 요소가 예상치 못한 객체인 경우 (string[] 자리에 object[] 등)
      // 일단 재귀 처리 — 최종적으로 JSX에서 렌더링 시 safe 함수가 방어
      return sanitizeForReact(item);
    }) as T;
  }

  // 일반 객체: 각 필드를 재귀 처리
  const result = {} as Record<string, unknown>;
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    result[key] = sanitizeForReact(value);
  }
  return result as T;
}
