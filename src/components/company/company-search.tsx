"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface CompanySearchProps {
  onSearch: (query: string) => void;
  initialQuery?: string;
  variant?: "default" | "hero";
}

export function CompanySearch({ onSearch, initialQuery = "", variant = "default" }: CompanySearchProps) {
  const [query, setQuery] = useState(initialQuery);
  const inputRef = useRef<HTMLInputElement>(null);

  // 페이지 진입 시 자동 포커스
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setQuery(value);
    onSearch(value);
  }

  function handleClear() {
    setQuery("");
    onSearch("");
    inputRef.current?.focus();
  }

  const isHero = variant === "hero";

  return (
    <div className={cn("relative w-full", isHero ? "max-w-3xl" : "max-w-2xl")}>
      {/* 검색 아이콘 */}
      <svg
        className={cn(
          "pointer-events-none absolute top-1/2 -translate-y-1/2 text-muted-foreground/60",
          isHero ? "left-5 h-6 w-6" : "left-4 h-5 w-5"
        )}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
      </svg>
      <input
        ref={inputRef}
        type="text"
        placeholder="기업명, 산업, 배치로 검색..."
        value={query}
        onChange={handleChange}
        className={cn(
          "w-full border border-border/60 bg-white text-foreground transition-all duration-200 placeholder:text-muted-foreground/50 focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/10 dark:bg-gray-900/60",
          isHero
            ? "h-14 sm:h-16 rounded-3xl pl-14 pr-12 text-base sm:text-lg shadow-md"
            : "h-12 rounded-2xl pl-12 pr-10 text-base shadow-sm"
        )}
      />
      {/* 지우기 버튼 */}
      {query && (
        <button
          onClick={handleClear}
          className={cn(
            "absolute top-1/2 -translate-y-1/2 rounded-full text-muted-foreground/50 transition-colors hover:bg-muted hover:text-foreground",
            isHero ? "right-4 p-1.5" : "right-3 p-1"
          )}
        >
          <svg className={cn(isHero ? "h-5 w-5" : "h-4 w-4")} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
