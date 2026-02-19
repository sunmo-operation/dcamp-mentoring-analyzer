"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";

interface CompanySearchProps {
  onSearch: (query: string) => void;
  initialQuery?: string;
}

export function CompanySearch({ onSearch, initialQuery = "" }: CompanySearchProps) {
  const [query, setQuery] = useState(initialQuery);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setQuery(value);
    onSearch(value);
  }

  return (
    <div className="relative">
      <Input
        placeholder="기업명, 산업, 배치로 검색..."
        value={query}
        onChange={handleChange}
        className="max-w-md"
      />
    </div>
  );
}
