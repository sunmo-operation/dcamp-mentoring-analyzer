"use client";

import { useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") || "/";

  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
          router.push(from);
          router.refresh();
        } else {
          const data = await res.json().catch(() => null);
          setError(data?.error || "로그인에 실패했습니다");
        }
      } catch {
        setError("서버에 연결할 수 없습니다");
      } finally {
        setLoading(false);
      }
    },
    [password, from, router],
  );

  return (
    <div className="flex min-h-[calc(100vh-64px)] items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="toss-shadow rounded-2xl bg-card p-8">
          <h1 className="mb-2 text-xl font-bold text-foreground">
            AI 멘토링 분석기
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
        </div>
      </div>
    </div>
  );
}
