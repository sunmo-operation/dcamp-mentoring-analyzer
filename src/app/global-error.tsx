"use client";

// root layout 포함 모든 영역의 에러를 잡는 최후의 방어선
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ko">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: "2rem" }}>
        <div style={{ maxWidth: 480, margin: "4rem auto", textAlign: "center" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem" }}>
            문제가 발생했습니다
          </h1>
          <p style={{ color: "#6b7280", marginBottom: "1.5rem" }}>
            {error.message || "페이지를 불러오는 중 오류가 발생했습니다."}
          </p>
          <button
            onClick={reset}
            style={{
              padding: "0.625rem 1.25rem",
              borderRadius: "0.75rem",
              border: "1px solid #e5e7eb",
              background: "#fff",
              cursor: "pointer",
              fontSize: "0.875rem",
              fontWeight: 500,
            }}
          >
            다시 시도
          </button>
        </div>
      </body>
    </html>
  );
}
