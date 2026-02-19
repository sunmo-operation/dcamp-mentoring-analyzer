"use client";

import { useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CompanyCard } from "@/components/company/company-card";
import { CompanySearch } from "@/components/company/company-search";
import { AnalysisCard } from "@/components/analysis/analysis-card";
import { Separator } from "@/components/ui/separator";
import type { Company, AnalysisResult } from "@/types";

interface HomeClientProps {
  companies: Company[];
  recentAnalyses: AnalysisResult[];
  analysisCountByCompany: Record<string, number>;
}

export function HomeClient({
  companies,
  recentAnalyses,
  analysisCountByCompany,
}: HomeClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState(
    searchParams.get("q") || ""
  );

  const handleSearch = useCallback(
    (query: string) => {
      setSearchQuery(query);
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      const qs = params.toString();
      router.replace(qs ? `?${qs}` : "/", { scroll: false });
    },
    [router]
  );

  const filtered = companies.filter((c) => {
    const q = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.industryNames?.some((n) => n.toLowerCase().includes(q)) ?? false) ||
      (c.batchLabel?.toLowerCase().includes(q) ?? false) ||
      (c.description?.toLowerCase().includes(q) ?? false)
    );
  });

  // 분석 결과에 기업 정보를 매칭 (notionPageId 기준)
  const companyMap = Object.fromEntries(
    companies.map((c) => [c.notionPageId, c])
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* 헤더 섹션 */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">
          포트폴리오 기업 현황
        </h1>
        <p className="mt-1 text-muted-foreground">
          멘토링 원문을 AI로 분석하여 근본 과제와 액션을 도출합니다
        </p>
      </div>

      {/* 검색 */}
      <CompanySearch onSearch={handleSearch} initialQuery={searchQuery} />

      {/* 기업 목록 */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((company) => (
          <CompanyCard
            key={company.notionPageId}
            company={company}
            analysisCount={analysisCountByCompany[company.notionPageId] ?? 0}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="mt-8 text-center text-muted-foreground">
          검색 결과가 없습니다
        </p>
      )}

      {/* 최근 분석 */}
      {recentAnalyses.length > 0 && (
        <>
          <Separator className="my-10" />
          <div className="mb-6">
            <h2 className="text-xl font-bold tracking-tight">최근 분석</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              가장 최근 완료된 멘토링 분석 결과
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recentAnalyses.map((analysis) => (
              <AnalysisCard
                key={analysis.id}
                analysis={analysis}
                company={companyMap[analysis.companyId]}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
