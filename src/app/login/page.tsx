"use client";

import { useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";

export default function LoginPage() {
  const searchParams = useSearchParams();
  const from = searchParams.get("from") || "/";

  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError("");
      setLoading(true);

      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password }),
        });

        if (res.ok) {
          setSuccess(true);
          // 하드 네비게이션: 새 인증 쿠키가 미들웨어에 확실히 전달되도록
          window.location.href = from;
        } else {
          const data = await res.json().catch(() => null);
          setError(data?.error || "로그인에 실패했습니다");
          setLoading(false);
        }
      } catch {
        setError("서버에 연결할 수 없습니다");
        setLoading(false);
      }
    },
    [password, from],
  );

  return (
    <div className="flex min-h-[calc(100vh-64px)] items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="toss-shadow rounded-2xl bg-card p-8">
          {success ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="h-8 w-8 animate-spin rounded-full border-3 border-primary border-t-transparent" />
              <p className="text-sm font-medium text-foreground">
                로그인 성공! 페이지를 불러오는 중...
              </p>
            </div>
          ) : (
            <>
              <h1 className="mb-2 text-xl font-bold text-foreground">
                AI Mentoring Analyzer
              </h1>
              <p className="mb-6 text-sm text-muted-foreground">
                내부 도구입니다. 비밀번호를 입력해주세요.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="비밀번호"
                    autoFocus
                    required
                    className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>

                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading || !password}
                  className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "확인 중..." : "로그인"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
