"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { CompanyCard } from "@/components/company/company-card";
import { CompanySearch } from "@/components/company/company-search";
import { AnalysisCard } from "@/components/analysis/analysis-card";
import { useLiveRefresh } from "@/hooks/use-live-refresh";
import type { Company, AnalysisResult } from "@/types";

interface HomeClientProps {
  companies: Company[];
  recentAnalyses: AnalysisResult[];
  analysisCountByCompany: Record<string, number>;
  briefingCount: number;
}

export function HomeClient({
  companies: initialCompanies,
  recentAnalyses: initialRecentAnalyses,
  analysisCountByCompany: initialAnalysisCount,
  briefingCount,
}: HomeClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState(
    searchParams.get("q") || ""
  );

  // ── 가이드 접기 상태 (localStorage 연동) ──
  const [guideOpen, setGuideOpen] = useState(false);
  useEffect(() => {
    const saved = localStorage.getItem("guide-collapsed");
    // 저장된 값이 없으면 접힌 상태(false) 유지
    if (saved === "open") setGuideOpen(true);
  }, []);
  const toggleGuide = useCallback(() => {
    setGuideOpen((prev) => {
      const next = !prev;
      localStorage.setItem("guide-collapsed", next ? "open" : "closed");
      return next;
    });
  }, []);

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

  // 분석 결과에 기업 정보를 매칭 (notionPageId 기준)
  const companyMap = useMemo(() => Object.fromEntries(
    companies.map((c) => [c.notionPageId, c])
  ), [companies]);

  // ── 대시보드 통계 계산 ──
  const stats = useMemo(() => {
    const completedAnalyses = allAnalyses.filter((a) => a.status === "completed");
    const latestAnalysis = completedAnalyses
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

    let lastAnalysisLabel = "-";
    if (latestAnalysis) {
      const diff = Math.floor(
        (Date.now() - new Date(latestAnalysis.createdAt).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (diff === 0) lastAnalysisLabel = "오늘";
      else if (diff === 1) lastAnalysisLabel = "어제";
      else lastAnalysisLabel = `${diff}일 전`;
    }

    return {
      companyCount: companies.length,
      analysisCount: completedAnalyses.length,
      briefingCount,
      lastAnalysisLabel,
    };
  }, [companies, allAnalyses, briefingCount]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* 헤더 섹션 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">
          AI Mentoring Analyzer
        </h1>
        <p className="mt-1 text-muted-foreground">
          배치 프로그램 참여 팀의 멘토링 기록과 진행 상황을 AI가 종합 분석해,
          지금 어떤 상황이고 어디에 집중해야 하는지 빠르게 파악할 수 있는 dcamp 내부 도구입니다.
        </p>
      </div>

      {/* ① 가이드 — 접을 수 있는 배너 */}
      <div className="mb-6">
        <button
          onClick={toggleGuide}
          className="w-full flex items-center justify-between rounded-xl border border-border/40 bg-gradient-to-r from-gray-50/80 to-white dark:from-gray-900/40 dark:to-gray-950 px-4 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-900/60"
        >
          <div className="flex items-center gap-2 text-sm">
            <svg className="h-4 w-4 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span className="text-muted-foreground">
              Notion 데이터 수집 → AI 교차분석 → 브리핑 자동 생성
            </span>
          </div>
          <span className="text-xs text-muted-foreground/60 shrink-0 ml-2">
            {guideOpen ? "접기 ▲" : "자세히 ▼"}
          </span>
        </button>
        {guideOpen && (
          <div className="mt-2 rounded-xl border border-border/30 bg-white dark:bg-gray-900/60 p-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Step 1 */}
              <div className="rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-border/20 p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/40 text-[11px] font-bold text-blue-700 dark:text-blue-300">1</span>
                  <span className="text-xs font-semibold text-foreground">데이터 수집</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Notion DB에서 멘토링 기록, KPT 회고, 전문가 투입, OKR 등을 자동 수집합니다
                </p>
                <div className="flex flex-wrap gap-1">
                  <span className="inline-flex items-center rounded-md bg-blue-50 dark:bg-blue-950/30 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 dark:text-blue-300">Notion</span>
                  <span className="inline-flex items-center rounded-md bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">Slack</span>
                  <span className="inline-flex items-center rounded-md bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">Gmail</span>
                </div>
              </div>
              {/* Step 2 */}
              <div className="rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-border/20 p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-[11px] font-bold text-indigo-700 dark:text-indigo-300">2</span>
                  <span className="text-xs font-semibold text-foreground">AI 교차 분석</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  수집된 데이터를 AI가 교차 검증하여 반복 패턴, 숨겨진 신호, 멘토 피드백 이행 여부를 진단합니다
                </p>
              </div>
              {/* Step 3 */}
              <div className="rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-border/20 p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/40 text-[11px] font-bold text-green-700 dark:text-green-300">3</span>
                  <span className="text-xs font-semibold text-foreground">인사이트 도출</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  기업 카드 클릭 후 AI 브리핑 생성을 누르면, 배치 프로그램에서 다루는 아젠다와 현재 상황을 한눈에 파악할 수 있습니다
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ② 대시보드 통계 바 */}
      <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border/40 bg-white dark:bg-gray-900/60 px-4 py-3">
          <p className="text-2xl font-bold text-foreground">{stats.companyCount}<span className="text-base font-normal text-muted-foreground ml-0.5">개</span></p>
          <p className="text-xs text-muted-foreground mt-0.5">참여기업</p>
        </div>
        <div className="rounded-xl border border-border/40 bg-white dark:bg-gray-900/60 px-4 py-3">
          <p className="text-2xl font-bold text-foreground">{stats.analysisCount}<span className="text-base font-normal text-muted-foreground ml-0.5">건</span></p>
          <p className="text-xs text-muted-foreground mt-0.5">완료 분석</p>
        </div>
        <div className="rounded-xl border border-border/40 bg-white dark:bg-gray-900/60 px-4 py-3">
          <p className="text-2xl font-bold text-foreground">{stats.briefingCount}<span className="text-base font-normal text-muted-foreground ml-0.5">건</span></p>
          <p className="text-xs text-muted-foreground mt-0.5">생성 브리핑</p>
        </div>
        <div className="rounded-xl border border-border/40 bg-white dark:bg-gray-900/60 px-4 py-3">
          <p className="text-2xl font-bold text-foreground">{stats.lastAnalysisLabel}</p>
          <p className="text-xs text-muted-foreground mt-0.5">마지막 분석</p>
        </div>
      </div>

      {/* ③ 최근 분석 — 가로 스크롤 카드 */}
      {recentAnalyses.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">최근 분석</h2>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-thin">
            {recentAnalyses.map((analysis) => {
              const company = companyMap[analysis.companyId];
              const date = new Date(analysis.createdAt).toLocaleDateString("ko-KR", {
                month: "numeric",
                day: "numeric",
              });
              const summary = analysis.sections?.summary;
              return (
                <a
                  key={analysis.id}
                  href={`/analyze/${analysis.id}`}
                  className="shrink-0 w-44 rounded-xl border border-border/40 bg-white dark:bg-gray-900/60 p-3 hover:-translate-y-0.5 hover:shadow-md transition-all"
                >
                  <p className="text-xs text-muted-foreground">{date}</p>
                  <p className="text-sm font-semibold mt-1 truncate">
                    {company?.name || "기업"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                    {summary?.oneLiner || analysis.topic || "분석 완료"}
                  </p>
                </a>
              );
            })}
          </div>
        </div>
      )}

      {/* 검색 */}
      <div className="mb-1">
        <h2 className="text-lg font-semibold tracking-tight">어떤 기업이 궁금하세요?</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          아래 목록에서 직접 찾거나, 검색창에 기업명·산업·배치를 입력해보세요
        </p>
      </div>
      <CompanySearch onSearch={handleSearch} initialQuery={searchQuery} />

      {/* ④ 배치 탭 필터 */}
      <div className="mt-4 flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
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
    </div>
  );
}
