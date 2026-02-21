"use client";

import { useState, useCallback, useMemo, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { CompanyCard } from "@/components/company/company-card";
import { CompanySearch } from "@/components/company/company-search";
import { AnalysisCard } from "@/components/analysis/analysis-card";
import { Separator } from "@/components/ui/separator";
import { useLiveRefresh } from "@/hooks/use-live-refresh";
import type { Company, AnalysisResult } from "@/types";

interface HomeClientProps {
  companies: Company[];
  recentAnalyses: AnalysisResult[];
  analysisCountByCompany: Record<string, number>;
}

export function HomeClient({
  companies: initialCompanies,
  recentAnalyses: initialRecentAnalyses,
  analysisCountByCompany: initialAnalysisCount,
}: HomeClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState(
    searchParams.get("q") || ""
  );

  // ── SWR: 기업 목록 (SSR 데이터 → 백그라운드 갱신) ──
  const { data: companies = initialCompanies } = useSWR<Company[]>(
    "/api/companies",
    {
      fallbackData: initialCompanies,
      refreshInterval: 60_000,       // 60초마다 백그라운드 갱신
      revalidateOnFocus: true,       // 탭 복귀 시 갱신
      revalidateOnReconnect: true,   // 네트워크 복구 시 갱신
      dedupingInterval: 30_000,      // 30초 내 중복 요청 방지
    }
  );

  // ── SWR: 분석 결과 (SSR 데이터 → 백그라운드 갱신) ──
  const { data: allAnalyses = [] } = useSWR<AnalysisResult[]>(
    "/api/analyses",
    {
      fallbackData: initialRecentAnalyses, // 초기값으로 SSR 데이터
      refreshInterval: 60_000,
      revalidateOnFocus: true,
    }
  );

  // 분석 데이터에서 최신 5건 + 기업별 카운트 계산
  const { recentAnalyses, analysisCountByCompany } = useMemo(() => {
    const completed = allAnalyses.filter((a) => a.status === "completed");
    const recent = [...completed]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
    const countMap: Record<string, number> = {};
    for (const a of completed) {
      countMap[a.companyId] = (countMap[a.companyId] ?? 0) + 1;
    }
    return { recentAnalyses: recent, analysisCountByCompany: countMap };
  }, [allAnalyses]);

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

  // 검색 결과 필터링 (검색어/기업 목록이 바뀔 때만 재계산)
  const filtered = useMemo(() => companies.filter((c) => {
    const q = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.industryNames?.some((n) => n.toLowerCase().includes(q)) ?? false) ||
      (c.batchLabel?.toLowerCase().includes(q) ?? false) ||
      (c.description?.toLowerCase().includes(q) ?? false)
    );
  }), [companies, searchQuery]);

  // 기수(배치)별 그룹핑 — 기수 번호 내림차순 정렬
  const groupedByBatch = useMemo(() => {
    const groups = new Map<string, Company[]>();
    for (const c of filtered) {
      const label = c.batchName || "기타";
      if (!groups.has(label)) groups.set(label, []);
      groups.get(label)!.push(c);
    }
    // 기수 번호 내림차순 정렬 (숫자 추출, "기타"는 맨 뒤)
    const sorted = [...groups.entries()].sort(([a], [b]) => {
      const numA = parseInt(a.match(/\d+/)?.[0] || "0", 10);
      const numB = parseInt(b.match(/\d+/)?.[0] || "0", 10);
      if (numA === 0 && numB === 0) return a.localeCompare(b);
      if (numA === 0) return 1;
      if (numB === 0) return -1;
      return numB - numA;
    });
    return sorted;
  }, [filtered]);

  // 호버 프리페치: 서버 캐시 워밍 (기업당 1회만)
  const prefetchedRef = useRef<Set<string>>(new Set());
  const handlePrefetch = useCallback((companyId: string) => {
    if (prefetchedRef.current.has(companyId)) return;
    prefetchedRef.current.add(companyId);
    fetch(`/api/prefetch?id=${companyId}`).catch(() => {});
  }, []);

  // 분석 결과에 기업 정보를 매칭 (notionPageId 기준)
  const companyMap = useMemo(() => Object.fromEntries(
    companies.map((c) => [c.notionPageId, c])
  ), [companies]);

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

      {/* 기업 목록 — 기수별 그룹 */}
      {groupedByBatch.map(([batchLabel, batchCompanies]) => (
        <div key={batchLabel} className="mt-8">
          <div className="mb-3 flex items-center gap-2">
            <h2 className="text-lg font-semibold">{batchLabel}</h2>
            <span className="text-sm text-muted-foreground">
              {batchCompanies.length}개 기업
            </span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {batchCompanies.map((company) => (
              <div
                key={company.notionPageId}
                onMouseEnter={() => handlePrefetch(company.notionPageId)}
              >
                <CompanyCard
                  company={company}
                  analysisCount={analysisCountByCompany[company.notionPageId] ?? 0}
                />
              </div>
            ))}
          </div>
        </div>
      ))}

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
