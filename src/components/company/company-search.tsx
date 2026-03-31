"use client";

import { useState, useRef, useEffect } from "react";

interface CompanySearchProps {
  onSearch: (query: string) => void;
  initialQuery?: string;
}

export function CompanySearch({ onSearch, initialQuery = "" }: CompanySearchProps) {
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

  return (
    <div className="relative w-full max-w-2xl">
      <label htmlFor="company-search" className="sr-only">기업 검색</label>
      {/* 검색 아이콘 */}
      <svg
        className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground/60"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
      </svg>
      <input
        ref={inputRef}
        id="company-search"
        type="text"
        placeholder="기업명, 산업, 배치로 검색..."
        value={query}
        onChange={handleChange}
        className="h-12 w-full rounded-2xl border border-border/60 bg-white pl-12 pr-12 text-base text-foreground shadow-sm transition-all duration-200 placeholder:text-muted-foreground/50 focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-gray-900/60"
      />
      {/* 지우기 버튼 — 최소 44x44 터치 타겟 */}
      {query && (
        <button
          onClick={handleClear}
          aria-label="검색어 지우기"
          className="absolute right-2 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground/50 transition-colors hover:bg-muted hover:text-foreground"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
