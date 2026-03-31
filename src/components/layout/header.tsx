"use client";

import Image from "next/image";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

export function Header() {
  const { data: session } = useSession();

  return (
    <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-xl supports-[backdrop-filter]:bg-card/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2.5">
          <Image src="/dcamp-logo.png" alt="dcamp" width={80} height={24} className="h-6 w-auto" />
          <span className="text-lg font-bold tracking-tight text-foreground">
            AI <span className="text-primary">Mentoring Analyzer</span>
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          <Link
            href="/"
            className="rounded-xl px-4 py-2 text-sm font-medium text-muted-foreground transition-all duration-200 hover:bg-muted hover:text-foreground"
          >
            홈
          </Link>
          <Link
            href="/about"
            className="rounded-xl px-4 py-2 text-sm font-medium text-muted-foreground transition-all duration-200 hover:bg-muted hover:text-foreground"
          >
            About
          </Link>

          {/* 로그인 상태: 이름/아바타 + 로그아웃 */}
          {session?.user ? (
            <div className="ml-2 flex items-center gap-2">
              {session.user.image && (
                <Image
                  src={session.user.image}
                  alt=""
                  width={28}
                  height={28}
                  className="rounded-full"
                />
              )}
              <span className="text-sm font-medium text-foreground">
                {session.user.name}
              </span>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="rounded-xl px-3 py-1.5 text-xs font-medium text-muted-foreground transition-all duration-200 hover:bg-muted hover:text-foreground"
              >
                로그아웃
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="ml-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              로그인
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
