import Link from "next/link";

// 토스 스타일 헤더: 깨끗한 배경 + 블루 포인트
export function Header() {
  return (
    <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-xl supports-[backdrop-filter]:bg-card/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl font-bold tracking-tight text-foreground">
            dcamp <span className="text-primary">멘토링 분석기</span>
          </span>
        </Link>
        <nav className="flex items-center gap-3">
          <Link
            href="/"
            className="rounded-xl px-4 py-2 text-sm font-medium text-muted-foreground transition-all duration-200 hover:bg-muted hover:text-foreground"
          >
            홈
          </Link>
          <Link
            href="/analyze"
            className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all duration-200 hover:bg-[#1B6EF3] hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(49,130,246,0.3)] active:translate-y-0"
          >
            새 분석
          </Link>
        </nav>
      </div>
    </header>
  );
}
