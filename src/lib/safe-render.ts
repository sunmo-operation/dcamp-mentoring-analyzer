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
 * 브리핑/분석 데이터를 RSC 직렬화에 안전한 형태로 변환
 *
 * JSON round-trip을 통해 모든 값이 JSON-serializable임을 보장:
 * - undefined → 제거 (JSON에서 유효하지 않음)
 * - Date → ISO 문자열
 * - BigInt/Symbol/Function → 제거
 * - 순환 참조 → 빈 객체로 대체
 *
 * RSC(React Server Components) 프로토콜은 본질적으로 JSON 기반이므로,
 * JSON round-trip을 통과한 데이터는 RSC 직렬화에서 실패하지 않음.
 */
export function sanitizeForReact<T>(data: T): T {
  if (data === null || data === undefined) return data;
  if (typeof data !== "object") return data;

  try {
    // JSON round-trip: 가장 확실한 직렬화 안전성 검증
    return JSON.parse(JSON.stringify(data)) as T;
  } catch (err) {
    // 순환 참조 등으로 JSON.stringify 실패 시 수동 정리
    console.warn("[sanitizeForReact] JSON round-trip 실패, 수동 정리 수행:", err);
    return manualSanitize(data);
  }
}

/**
 * JSON round-trip 실패 시 fallback: 수동으로 객체를 정리
 */
function manualSanitize<T>(data: T, seen = new WeakSet()): T {
  if (data === null || data === undefined) return data;
  if (typeof data !== "object") return data;

  // 순환 참조 방지
  if (seen.has(data as object)) return {} as T;
  seen.add(data as object);

  if (Array.isArray(data)) {
    return data
      .filter((item) => typeof item !== "function" && typeof item !== "symbol")
      .map((item) => manualSanitize(item, seen)) as T;
  }

  const result = {} as Record<string, unknown>;
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    // function, symbol, undefined는 제거
    if (typeof value === "function" || typeof value === "symbol" || value === undefined) {
      continue;
    }
    // Date → ISO 문자열
    if (value instanceof Date) {
      result[key] = value.toISOString();
      continue;
    }
    // BigInt → 문자열
    if (typeof value === "bigint") {
      result[key] = String(value);
      continue;
    }
    result[key] = manualSanitize(value, seen);
  }
  return result as T;
}
