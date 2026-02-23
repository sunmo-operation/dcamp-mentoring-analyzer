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
      {/* 검색 아이콘 */}
      <svg
        className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground/60"
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
        className="h-12 w-full rounded-2xl border border-border/60 bg-white pl-12 pr-10 text-base text-foreground shadow-sm transition-all duration-200 placeholder:text-muted-foreground/50 focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/10 dark:bg-gray-900/60"
      />
      {/* 지우기 버튼 */}
      {query && (
        <button
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground/50 transition-colors hover:bg-muted hover:text-foreground"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
