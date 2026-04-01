"use client";

import { useState, useCallback, useMemo, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import useSWR from "swr";
import { CompanyCard } from "@/components/company/company-card";
import { CompanySearch } from "@/components/company/company-search";
import type { Company, AnalysisResult } from "@/types";

interface HomeClientProps {
  companies: Company[];
  recentAnalyses: AnalysisResult[];
  analysisCountByCompany: Record<string, number>;
  lastAnalysisByCompany: Record<string, string>;
  briefingByCompany: Record<string, boolean>;
}

export function HomeClient({
  companies: initialCompanies,
  recentAnalyses: initialRecentAnalyses,
  analysisCountByCompany: initialAnalysisCount,
  lastAnalysisByCompany,
  briefingByCompany,
}: HomeClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState(
    searchParams.get("q") || ""
  );

  // ── 배치 탭 필터 ──
  const [selectedBatch, setSelectedBatch] = useState<string>(
    searchParams.get("batch") || "전체"
  );

  // ── SWR: 기업 목록 (SSR 데이터 → 백그라운드 갱신) ──
  const { data: companies = initialCompanies } = useSWR<Company[]>(
    "/api/companies",
    {
      fallbackData: initialCompanies,
      refreshInterval: 60_000,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 30_000,
    }
  );

  // ── SWR: 분석 결과 (SSR 데이터 → 백그라운드 갱신) ──
  const { data: allAnalyses = [] } = useSWR<AnalysisResult[]>(
    "/api/analyses",
    {
      fallbackData: initialRecentAnalyses,
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

  // 분석 결과에 기업 정보를 매칭 (notionPageId 기준)
  const companyMap = useMemo(() => Object.fromEntries(
    companies.map((c) => [c.notionPageId, c])
  ), [companies]);

  // Quick Access: 최근 분석된 기업 5개 칩
  const recentCompanyChips = useMemo(() => {
    const seen = new Set<string>();
    const chips: { id: string; name: string }[] = [];
    for (const a of recentAnalyses) {
      if (seen.has(a.companyId)) continue;
      seen.add(a.companyId);
      const company = companyMap[a.companyId];
      if (company) chips.push({ id: company.notionPageId, name: company.name });
      if (chips.length >= 5) break;
    }
    return chips;
  }, [recentAnalyses, companyMap]);

  const handleSearch = useCallback(
    (query: string) => {
      setSearchQuery(query);
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (selectedBatch !== "전체") params.set("batch", selectedBatch);
      const qs = params.toString();
      router.replace(qs ? `?${qs}` : "/", { scroll: false });
    },
    [router, selectedBatch]
  );

  // 배치 탭 변경 핸들러
  const handleBatchChange = useCallback(
    (batch: string) => {
      setSelectedBatch(batch);
      const params = new URLSearchParams();
      if (searchQuery) params.set("q", searchQuery);
      if (batch !== "전체") params.set("batch", batch);
      const qs = params.toString();
      router.replace(qs ? `?${qs}` : "/", { scroll: false });
    },
    [router, searchQuery]
  );

  // 사용 가능한 배치 목록 추출
  const batchTabs = useMemo(() => {
    const batchSet = new Set<string>();
    for (const c of companies) {
      if (c.batchName) batchSet.add(c.batchName);
    }
    // 기수 번호 내림차순 정렬
    const sorted = [...batchSet].sort((a, b) => {
      const numA = parseInt(a.match(/\d+/)?.[0] || "0", 10);
      const numB = parseInt(b.match(/\d+/)?.[0] || "0", 10);
      if (numA === 0 && numB === 0) return a.localeCompare(b);
      if (numA === 0) return 1;
      if (numB === 0) return -1;
      return numB - numA;
    });
    return ["전체", ...sorted];
  }, [companies]);

  // 검색 + 배치 필터 적용
  const filtered = useMemo(() => companies.filter((c) => {
    // 배치 필터
    if (selectedBatch !== "전체") {
      if (c.batchName !== selectedBatch) return false;
    }
    // 텍스트 검색
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.industryNames?.some((n) => n.toLowerCase().includes(q)) ?? false) ||
      (c.batchLabel?.toLowerCase().includes(q) ?? false) ||
      (c.description?.toLowerCase().includes(q) ?? false)
    );
  }), [companies, searchQuery, selectedBatch]);

  // 기수(배치)별 그룹핑 — 기수 번호 내림차순 정렬
  const groupedByBatch = useMemo(() => {
    const groups = new Map<string, Company[]>();
    for (const c of filtered) {
      const label = c.batchName || "기타";
      if (!groups.has(label)) groups.set(label, []);
      groups.get(label)!.push(c);
    }
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

  return (
    <div>
      {/* Hero 섹션 */}
      <div className="hero-gradient">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:py-20 lg:py-24 flex flex-col items-center text-center">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
            어떤 기업이 궁금하세요?
          </h1>
          <p className="mt-3 text-sm sm:text-base text-muted-foreground max-w-lg">
            기업명, 산업, 배치를 입력하면 3분 안에 현황을 파악할 수 있어요
          </p>
          <div className="mt-6 sm:mt-8 w-full flex justify-center">
            <CompanySearch variant="hero" onSearch={handleSearch} initialQuery={searchQuery} />
          </div>

          {/* Quick Access Chips */}
          {recentCompanyChips.length > 0 && (
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <span className="text-xs text-muted-foreground/60 self-center mr-1">최근 분석</span>
              {recentCompanyChips.map((chip) => (
                <Link
                  key={chip.id}
                  href={`/companies/${chip.id}`}
                  className="rounded-full border border-border/50 bg-white dark:bg-gray-900/60 px-3 py-1 text-xs font-medium text-foreground/80 transition-colors hover:bg-muted hover:text-foreground"
                >
                  {chip.name}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="mx-auto max-w-6xl px-4 pb-8">
        {/* 배치 탭 필터 — sticky */}
        <div className="sticky top-14 z-40 bg-background/95 backdrop-blur-sm -mx-4 px-4 py-3">
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
            {batchTabs.map((batch) => (
              <button
                key={batch}
                onClick={() => handleBatchChange(batch)}
                className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  selectedBatch === batch
                    ? "bg-foreground text-background"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted"
                }`}
              >
                {batch}
              </button>
            ))}
          </div>
        </div>

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
                    lastAnalysisDate={lastAnalysisByCompany[company.notionPageId]}
                    hasBriefing={briefingByCompany[company.notionPageId]}
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
      </div>
    </div>
  );
}
