"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, useSession } from "next-auth/react";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") || "/";
  const { data: session } = useSession();

  // 이미 로그인 상태면 홈으로 리다이렉트
  useEffect(() => {
    if (session?.user) {
      window.location.href = from;
    }
  }, [session, from]);

  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleGoogleLogin = () => {
    signIn("google", { callbackUrl: from });
  };

  const handlePasswordSubmit = useCallback(
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

  const hasSitePassword = process.env.NEXT_PUBLIC_HAS_SITE_PASSWORD === "true";

  return (
    <div className="flex min-h-[calc(100vh-64px)] items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="toss-shadow rounded-2xl bg-card p-8">
          <h1 className="mb-2 text-xl font-bold text-foreground">
            AI Mentoring Analyzer
          </h1>
          <p className="mb-6 text-sm text-muted-foreground">
            디캠프 내부 도구입니다.
          </p>

          {/* Google OAuth — 메인 로그인 */}
          <button
            onClick={handleGoogleLogin}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-input bg-background px-4 py-3 text-sm font-semibold text-foreground transition-all hover:bg-muted"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            디캠프 계정으로 로그인
          </button>

          <p className="mt-3 text-center text-xs text-muted-foreground">
            @dcamp.kr 구글 계정만 사용 가능
          </p>

          {/* 비밀번호 폴백 — SITE_PASSWORD 설정 시만 표시 */}
          {hasSitePassword && (
            <div className="mt-6">
              <button
                onClick={() => setShowPassword(!showPassword)}
                className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword
                  ? "▲ 비밀번호 입력 접기"
                  : "▼ 비밀번호로 로그인"}
              </button>

              {showPassword && (
                <form
                  onSubmit={handlePasswordSubmit}
                  className="mt-3 space-y-3"
                >
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="비밀번호"
                    required
                    className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  />

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
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
