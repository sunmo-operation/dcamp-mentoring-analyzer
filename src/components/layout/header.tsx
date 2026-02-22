import Image from "next/image";
import Link from "next/link";

// 토스 스타일 헤더: 깨끗한 배경 + 블루 포인트
export function Header() {
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
        </nav>
      </div>
    </header>
  );
}
