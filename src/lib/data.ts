// ══════════════════════════════════════════════════
// data.ts — Notion 연동 래퍼 + 분석/브리핑 저장
// POSTGRES_URL 있으면 Vercel Postgres, 없으면 로컬 JSON
// ══════════════════════════════════════════════════
import { promises as fs } from "fs";
import path from "path";
import type {
  Company,
  MentoringSession,
  ExpertRequest,
  TimelineEvent,
  AnalysisResult,
  CompanyBriefing,
  BatchDashboardData,
  KptReview,
  ExecutiveSnapshot,
} from "@/types";
import {
  dbGetAnalyses,
  dbGetAnalysis,
  dbGetAnalysesByCompany,
  dbSaveAnalysis,
  dbGetBriefings,
  dbGetBriefingByCompany,
  dbSaveBriefing,
} from "@/lib/db";
import { sanitizeForReact } from "@/lib/safe-render";
import { getClaudeClient } from "@/lib/claude";
import { getExcelDataByName } from "@/lib/excel-data";

const useDB = !!process.env.POSTGRES_URL;
import {
  getCompanies as notionGetCompanies,
  getCompaniesBasic as notionGetCompaniesBasic,
  getCompany as notionGetCompany,
  getMentoringSessions as notionGetSessions,
  getMentoringSessionWithTranscript as notionGetSessionWithTranscript,
  getMentors as notionGetMentors,
  getMentorsByCompany as notionGetMentorsByCompany,
  getExpertRequests as notionGetExpertRequests,
  getTimeline as notionGetTimeline,
  extractPageText as notionExtractPageText,
  clearCache as notionClearCache,
  sessionToTimelineType,
  getKptReviews as notionGetKptReviews,
  getOkrItems as notionGetOkrItems,
  getOkrValues as notionGetOkrValues,
  getBatchOkrData as notionGetBatchOkrData,
  getBatchGrowthData as notionGetBatchGrowthData,
  getCompanySurveyData as notionGetCompanySurveyData,
} from "@/lib/notion";

// ── 분석 결과 JSON 저장소 ─────────────────────────
// Vercel은 읽기 전용 파일 시스템이므로 /tmp에 저장
// 로컬 개발 시에는 기존 src/data 사용
const isVercel = !!process.env.VERCEL;
const DATA_DIR = isVercel
  ? "/tmp"
  : path.join(process.cwd(), "src", "data");

function filePath(name: string) {
  return path.join(DATA_DIR, name);
}

// ── 파일별 인메모리 뮤텍스 (동시 쓰기 Race Condition 방어) ──
const fileLocks = new Map<string, Promise<void>>();

async function withFileLock<T>(filename: string, fn: () => Promise<T>): Promise<T> {
  // 현재 파일에 대한 진행 중인 작업이 있으면 대기
  const currentLock = fileLocks.get(filename) ?? Promise.resolve();

  let resolve: () => void;
  const newLock = new Promise<void>((r) => { resolve = r; });
  fileLocks.set(filename, newLock);

  try {
    await currentLock;
    return await fn();
  } finally {
    resolve!();
    // 대기 중인 작업이 없으면 정리
    if (fileLocks.get(filename) === newLock) {
      fileLocks.delete(filename);
    }
  }
}

async function readJSON<T>(filename: string): Promise<T[]> {
  try {
    const raw = await fs.readFile(filePath(filename), "utf-8");
    return JSON.parse(raw) as T[];
  } catch {
    // 파일이 없으면 빈 배열 반환
    return [];
  }
}

async function writeJSON<T>(filename: string, data: T[]): Promise<void> {
  await fs.writeFile(filePath(filename), JSON.stringify(data, null, 2), "utf-8");
}

// ══════════════════════════════════════════════════
// 기업 (Notion 연동)
// ══════════════════════════════════════════════════

export async function getCompanies(): Promise<Company[]> {
  return notionGetCompanies();
}

// 홈페이지용 경량 조회 (Notion API 1회, enrichment 없음)
export async function getCompaniesBasic(): Promise<Company[]> {
  return notionGetCompaniesBasic();
}

export async function getCompany(id: string): Promise<Company | undefined> {
  return notionGetCompany(id);
}

// ══════════════════════════════════════════════════
// 멘토링 세션 (Notion 연동, 기존 getMentoringRecords 대체)
// ══════════════════════════════════════════════════

export async function getMentoringSessions(
  companyId?: string
): Promise<MentoringSession[]> {
  return notionGetSessions(companyId);
}

export async function getMentoringSessionsByCompany(
  companyId: string
): Promise<MentoringSession[]> {
  return notionGetSessions(companyId);
}

// ══════════════════════════════════════════════════
// 분석 결과 (로컬 JSON 유지 — 앱에서 생성하는 데이터)
// ══════════════════════════════════════════════════

export async function getAnalyses(): Promise<AnalysisResult[]> {
  if (useDB) return dbGetAnalyses();
  return readJSON<AnalysisResult>("analyses.json");
}

export async function getAnalysis(
  id: string
): Promise<AnalysisResult | undefined> {
  if (useDB) return dbGetAnalysis(id);
  const analyses = await getAnalyses();
  return analyses.find((a) => a.id === id);
}

export async function getAnalysesByCompany(
  companyId: string
): Promise<AnalysisResult[]> {
  if (useDB) return dbGetAnalysesByCompany(companyId);
  const analyses = await getAnalyses();
  return analyses
    .filter((a) => a.companyId === companyId)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
}

export async function saveAnalysis(
  analysis: AnalysisResult
): Promise<void> {
  if (useDB) return dbSaveAnalysis(analysis);
  await withFileLock("analyses.json", async () => {
    const analyses = await readJSON<AnalysisResult>("analyses.json");
    const idx = analyses.findIndex((a) => a.id === analysis.id);
    if (idx >= 0) {
      analyses[idx] = analysis;
    } else {
      analyses.push(analysis);
    }
    await writeJSON("analyses.json", analyses);
  });
}

export async function getRecentAnalyses(
  limit: number = 5
): Promise<AnalysisResult[]> {
  const analyses = await getAnalyses();
  return analyses
    .filter((a) => a.status === "completed")
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, limit);
}

// ══════════════════════════════════════════════════
// 기업 통합 데이터 (Notion API 중복 호출 제거)
// ══════════════════════════════════════════════════

export interface CompanyAllData {
  company: Company;
  sessions: MentoringSession[];
  expertRequests: ExpertRequest[];
  timeline: TimelineEvent[];
  analyses: AnalysisResult[];
}

// 기업 전체 데이터 메모리 캐시 (3분 TTL)
const companyDataCache = new Map<string, { data: CompanyAllData; expires: number }>();

// ── 사전 설문 AI 요약 (1시간 캐시) ──────────────
const surveySummaryCache = new Map<string, { data: { productOneLiner?: string; batchGoal?: string }; expires: number }>();

async function summarizeSurveyText(
  companyId: string,
  productIntro?: string,
  yearMilestone?: string,
): Promise<{ productOneLiner?: string; batchGoal?: string }> {
  if (!productIntro && !yearMilestone) return {};

  // 캐시 확인
  const cached = surveySummaryCache.get(companyId);
  if (cached && cached.expires > Date.now()) return cached.data;

  // 이미 충분히 짧으면 AI 호출 생략
  const shortEnough = (!productIntro || productIntro.length <= 60) &&
    (!yearMilestone || yearMilestone.length <= 60);
  if (shortEnough) {
    const result = { productOneLiner: productIntro, batchGoal: yearMilestone };
    surveySummaryCache.set(companyId, { data: result, expires: Date.now() + 3_600_000 });
    return result;
  }

  try {
    const client = getClaudeClient();
    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 256,
      messages: [{
        role: "user",
        content: `스타트업 액셀러레이터 포트폴리오 매니저로서, 사전 설문 원문을 투자자/경영진이 한눈에 파악할 수 있도록 비즈니스 프렌들리한 한 줄 요약으로 변환하세요.

규칙:
- 각 항목 50자 이내, 명사구 형태 ("~입니다" 금지)
- 핵심 비즈니스 모델/가치/지표만 남기고 불필요한 수식어 제거
- 숫자, KPI가 있으면 반드시 유지

${productIntro ? `[제품/서비스 소개 원문]\n${productIntro}\n` : ""}
${yearMilestone ? `[배치 기간 핵심 목표 원문]\n${yearMilestone}\n` : ""}
반드시 아래 JSON 형식으로만 응답:
{"productOneLiner": "요약", "batchGoal": "요약"}`,
      }],
    });
    const text = msg.content[0].type === "text" ? msg.content[0].text : "";
    const json = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || "{}");
    const result = {
      productOneLiner: json.productOneLiner || productIntro?.slice(0, 60),
      batchGoal: json.batchGoal || yearMilestone?.slice(0, 60),
    };
    surveySummaryCache.set(companyId, { data: result, expires: Date.now() + 3_600_000 });
    return result;
  } catch (error) {
    console.warn("[data] 설문 AI 요약 실패, 원문 truncate:", error);
    const result = {
      productOneLiner: productIntro?.slice(0, 60),
      batchGoal: yearMilestone?.slice(0, 60),
    };
    surveySummaryCache.set(companyId, { data: result, expires: Date.now() + 300_000 });
    return result;
  }
}

// ── Executive Snapshot AI 요약 (2시간 캐시) ──────
const snapshotCache = new Map<string, { data: ExecutiveSnapshot; expires: number }>();

/**
 * 엑셀 사전설문 + 투자현황 데이터를 맥킨지 수석 컨설턴트 스타일로 요약
 * 6개 핵심 필드: 대표자, 제품소개, 투자현황, 배치목표, 핵심차별성, 이상적 비전
 */
export async function generateExecutiveSnapshot(
  company: Company,
): Promise<ExecutiveSnapshot | null> {
  const excel = company.excel;
  if (!excel) return null;

  const survey = excel.survey;
  const investment = excel.investment;

  // 원문이 충분하지 않으면 스킵
  const hasData = survey?.productIntro || survey?.yearGoal || survey?.idealSuccess ||
    company.description || investment?.latestRound;
  if (!hasData) return null;

  // 캐시 확인
  const cacheKey = company.notionPageId || company.name;
  const cached = snapshotCache.get(cacheKey);
  if (cached && cached.expires > Date.now()) return cached.data;

  // 원문 소스 수집 (AI에 전달할 컨텍스트)
  const rawSources: string[] = [];
  rawSources.push(`[기업명] ${company.name}`);
  rawSources.push(`[대표자] ${company.ceoName || excel.pmPrimary || "미확인"}`);
  if (company.description) rawSources.push(`[기업소개(Notion)] ${company.description}`);
  if (survey?.productIntro) rawSources.push(`[제품/서비스 소개(설문)] ${survey.productIntro}`);
  if (survey?.businessModel) rawSources.push(`[비즈니스 모델(설문)] ${survey.businessModel}`);
  if (survey?.revenueModel) rawSources.push(`[수익 모델(설문)] ${survey.revenueModel}`);
  if (survey?.investmentStatus) rawSources.push(`[투자유치 현황(설문)] ${survey.investmentStatus}`);
  if (investment) {
    const invParts: string[] = [];
    if (investment.latestRound) invParts.push(`최근라운드: ${investment.latestRound}`);
    if (investment.preMoneyValuation) invParts.push(`Pre-money: ${investment.preMoneyValuation}`);
    if (investment.cumulativeFunding) invParts.push(`누적: ${investment.cumulativeFunding}`);
    if (investment.leadInvestor) invParts.push(`리드: ${investment.leadInvestor}`);
    if (investment.nextRound) invParts.push(`다음라운드: ${investment.nextRound}`);
    if (investment.revenue2025) invParts.push(`25년결산: ${investment.revenue2025}억`);
    if (invParts.length) rawSources.push(`[투자현황(엑셀)] ${invParts.join(" | ")}`);
  }
  if (survey?.yearGoal) rawSources.push(`[배치 기간 목표(설문)] ${survey.yearGoal}`);
  if (survey?.moat) rawSources.push(`[핵심 차별성/해자(설문)] ${survey.moat}`);
  if (survey?.valueProposition) rawSources.push(`[핵심 가치 제안(설문)] ${survey.valueProposition}`);
  if (survey?.competitors) rawSources.push(`[경쟁 현황(설문)] ${survey.competitors}`);
  if (survey?.idealSuccess) rawSources.push(`[이상적 성공 모습(설문)] ${survey.idealSuccess}`);
  if (survey?.targetCustomer) rawSources.push(`[타겟 고객(설문)] ${survey.targetCustomer}`);
  if (survey?.currentFocus) rawSources.push(`[현재 집중 영역(설문)] ${survey.currentFocus}`);
  if (survey?.biggestChallenge) rawSources.push(`[최대 과제(설문)] ${survey.biggestChallenge}`);
  if (survey?.ipStatus) rawSources.push(`[IP 현황(설문)] ${survey.ipStatus}`);
  if (survey?.trlStage) rawSources.push(`[TRL 단계(설문)] ${survey.trlStage}`);

  try {
    const client = getClaudeClient();
    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 600,
      messages: [{
        role: "user",
        content: `당신은 맥킨지 수석 파트너입니다. 아래 스타트업의 원시 데이터를 보고 6개 항목을 경영진 브리핑용으로 요약하세요.

## 규칙
- 각 항목 1~2문장, 최대 80자
- 맥킨지 톤: 팩트 기반, 정량적, 임팩트 중심
- "~입니다" 금지. 명사구 또는 "~중/~예정/~확보" 같은 간결체
- 숫자·지표가 있으면 반드시 유지
- 데이터가 없는 항목은 관련 정보로 유추. 유추 불가 시 "확인 필요"
- 억/만 단위 금액은 읽기 쉽게 변환 (예: 16063474000 → "약 160억")

## 원시 데이터
${rawSources.join("\n")}

## 출력 (JSON만)
{"productSummary":"제품/서비스 한줄 요약","investmentSummary":"투자 현황 요약","batchGoal":"배치 기간 핵심 목표","moat":"핵심 차별성/해자","idealVision":"이상적 성공 모습"}`,
      }],
    });
    const text = msg.content[0].type === "text" ? msg.content[0].text : "";
    const json = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || "{}");

    const snapshot: ExecutiveSnapshot = {
      ceoName: company.ceoName || "확인 필요",
      productSummary: json.productSummary || company.description?.slice(0, 80) || "확인 필요",
      investmentSummary: json.investmentSummary || investment?.latestRound || "확인 필요",
      batchGoal: json.batchGoal || survey?.yearGoal?.slice(0, 80) || "확인 필요",
      moat: json.moat || survey?.moat?.slice(0, 80) || survey?.valueProposition?.slice(0, 80) || "확인 필요",
      idealVision: json.idealVision || survey?.idealSuccess?.slice(0, 80) || "확인 필요",
    };

    snapshotCache.set(cacheKey, { data: snapshot, expires: Date.now() + 7_200_000 });
    return snapshot;
  } catch (error) {
    console.warn("[data] Executive Snapshot 생성 실패:", error);
    // 폴백: 원문 truncate
    const fallback: ExecutiveSnapshot = {
      ceoName: company.ceoName || "확인 필요",
      productSummary: survey?.productIntro?.slice(0, 80) || company.description?.slice(0, 80) || "확인 필요",
      investmentSummary: investment?.latestRound ? `${investment.latestRound} 단계` : "확인 필요",
      batchGoal: survey?.yearGoal?.slice(0, 80) || "확인 필요",
      moat: survey?.moat?.slice(0, 80) || survey?.valueProposition?.slice(0, 80) || "확인 필요",
      idealVision: survey?.idealSuccess?.slice(0, 80) || "확인 필요",
    };
    snapshotCache.set(cacheKey, { data: fallback, expires: Date.now() + 300_000 });
    return fallback;
  }
}

// ── KPT 회고 AI 요약 (30분 캐시) ──────────────
const kptSummaryCache = new Map<string, { data: string; count: number; expires: number }>();

/**
 * 최근 2~3개월 KPT를 AI로 요약
 * Keep/Problem/Try를 종합해 팀의 현재 상태를 2~3줄로 진단
 */
export async function summarizeRecentKpt(
  companyId: string,
  kptReviews: KptReview[],
): Promise<{ summary: string; count: number } | null> {
  if (kptReviews.length === 0) return null;

  // 캐시 확인
  const cached = kptSummaryCache.get(companyId);
  if (cached && cached.expires > Date.now()) {
    return { summary: cached.data, count: cached.count };
  }

  // 최근 3개월 필터
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  const cutoff = threeMonthsAgo.toISOString().slice(0, 10);

  const recent = kptReviews
    .filter((k) => (k.reviewDate || "") >= cutoff)
    .sort((a, b) => (b.reviewDate || "").localeCompare(a.reviewDate || ""));

  if (recent.length === 0) return null;

  // 폴백을 먼저 반환하고, AI 요약은 백그라운드에서 실행
  // → 콜드 스타트 시 KPT AI 호출 대기(2~3초) 제거
  const latest = recent[0];
  const fallback = [
    latest.keep && `잘한 점: ${latest.keep.slice(0, 60)}`,
    latest.problem && `과제: ${latest.problem.slice(0, 60)}`,
    latest.try && `시도: ${latest.try?.slice(0, 60)}`,
  ].filter(Boolean).join("\n");

  // 백그라운드 AI 요약 (다음 요청에서 캐시로 제공)
  const kptText = recent.map((k) => {
    const parts: string[] = [];
    if (k.reviewDate) parts.push(`[${k.reviewDate}]`);
    if (k.keep) parts.push(`Keep: ${k.keep}`);
    if (k.problem) parts.push(`Problem: ${k.problem}`);
    if (k.try) parts.push(`Try: ${k.try}`);
    return parts.join("\n");
  }).join("\n---\n");

  // AI 요약을 비차단으로 실행 — 결과는 캐시에 저장되어 다음 요청에 반영
  const recentCount = recent.length;
  try { getClaudeClient(); } catch { return fallback ? { summary: fallback, count: recent.length } : null; }
  getClaudeClient().messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 300,
    messages: [{
      role: "user",
      content: `스타트업 액셀러레이터 PM으로서, 아래 KPT 회고 ${recentCount}건을 분석해 팀의 현재 상태를 3줄 이내로 진단하세요.

규칙:
- 1줄: 잘 되고 있는 것 (Keep 핵심)
- 2줄: 풀어야 할 과제 (Problem 핵심)
- 3줄: 다음 시도/방향 (Try 핵심)
- 각 줄 40자 이내, "~중", "~예정" 같은 간결체
- 구체적 수치/키워드가 있으면 유지

${kptText}`,
    }],
  }).then((msg) => {
    const summary = msg.content[0].type === "text" ? msg.content[0].text.trim() : "";
    if (summary) {
      kptSummaryCache.set(companyId, { data: summary, count: recentCount, expires: Date.now() + 1_800_000 });
    }
  }).catch((err) => {
    console.warn("[data] KPT AI 요약 백그라운드 실패:", err);
  });

  // 즉시 폴백 반환 (AI 결과는 다음 요청에서 캐시로 사용)
  if (fallback) {
    return { summary: fallback, count: recent.length };
  }
  return null;
}

/**
 * 경량 기업 조회: Notion 1회 + 로컬 엑셀 병합
 * getCompanyAllData(4 Notion calls)와 달리 1 Notion call로 즉시 반환
 * → 기업 상세 페이지 초기 로드용 (프로필 + AI 브리핑만 표시)
 */
export async function getCompanyLight(
  companyNotionPageId: string
): Promise<Company | null> {
  const t0 = Date.now();
  const company = await notionGetCompany(companyNotionPageId);
  if (!company) return null;

  // 엑셀 마스터 시트 데이터 병합 (로컬 JSON → 즉시)
  const excelData = getExcelDataByName(company.name);
  if (excelData) company.excel = excelData;

  // AI 스냅샷 캐시 히트 시 즉시 반영 (미스 시 건너뜀 — 페이지 차단 없음)
  const snapshotCacheKey = company.notionPageId || company.name;
  const cachedSnapshot = snapshotCache.get(snapshotCacheKey);
  if (cachedSnapshot && cachedSnapshot.expires > Date.now()) {
    company.executiveSnapshot = cachedSnapshot.data;
  } else if (company.excel) {
    // 캐시 미스: 백그라운드에서 생성 (다음 요청에 반영)
    generateExecutiveSnapshot(company).catch(() => {});
  }

  console.log(`[perf] getCompanyLight(${companyNotionPageId.slice(0,8)}): ${Date.now() - t0}ms`);
  return sanitizeForReact(company);
}

/**
 * 기업의 모든 데이터를 통합 조회 (캐시 적용)
 * Notion API: company(1회) + sessions(1회) + expertRequests(1회) = 최대 3회
 * 캐시 히트 시 0회
 */
export async function getCompanyAllData(
  companyNotionPageId: string
): Promise<CompanyAllData | null> {
  const t0 = Date.now();

  // 캐시 확인
  const cached = companyDataCache.get(companyNotionPageId);
  if (cached && cached.expires > Date.now()) {
    console.log(`[perf] getCompanyAllData(${companyNotionPageId.slice(0,8)}): 캐시 히트 (${Date.now() - t0}ms)`);
    return cached.data;
  }

  // 기업 정보 + 세션 + 전문가 요청 + 사전 설문을 모두 병렬 호출
  const t1 = Date.now();
  const [company, sessions, expertRequests, surveyData] = await Promise.all([
    notionGetCompany(companyNotionPageId),
    notionGetSessions(companyNotionPageId).catch((error) => {
      console.warn("[data] 세션 조회 실패:", error);
      return [] as MentoringSession[];
    }),
    notionGetExpertRequests(companyNotionPageId).catch((error) => {
      console.warn("[data] 전문가 요청 조회 실패:", error);
      return [] as ExpertRequest[];
    }),
    notionGetCompanySurveyData(companyNotionPageId).catch((error) => {
      console.warn("[data] 사전 설문 조회 실패:", error);
      return null;
    }),
  ]);
  console.log(`[perf] getCompanyAllData > Notion 병렬호출: ${Date.now() - t1}ms (company + sessions ${sessions.length}건 + expertRequests ${expertRequests.length}건 + survey)`);

  if (expertRequests.length === 0) {
    console.warn(`[data] ⚠ 전문가 요청 0건 (companyId=${companyNotionPageId.slice(0, 8)}..., DB=${process.env.NOTION_EXPERT_REQUESTS_DB_ID?.slice(0, 8)}...). DB ID가 올바른지 확인 필요.`);
  }

  if (!company) return null;

  // 엑셀 마스터 시트 데이터 병합 (PM, 투자현황, 사전설문 등)
  const excelData = getExcelDataByName(company.name);
  if (excelData) {
    company.excel = excelData;
  }

  // 사전 설문 기본 필드 먼저 반영 (비동기 불필요)
  if (surveyData?.valuation) company.valuation = surveyData.valuation;

  // AI 요약 2건: 캐시 히트 시 즉시, 미스 시 비차단 백그라운드 실행
  // → 콜드 스타트 5~7초 → ~1초로 단축 (AI 호출 대기 제거)
  const t2 = Date.now();
  const snapshotCacheKey = company.notionPageId || company.name;
  const cachedSnapshot = snapshotCache.get(snapshotCacheKey);
  const cachedSurvey = surveySummaryCache.get(companyNotionPageId);

  const hasSnapshotCache = cachedSnapshot && cachedSnapshot.expires > Date.now();
  const hasSurveyCache = cachedSurvey && cachedSurvey.expires > Date.now();

  if (hasSnapshotCache || hasSurveyCache) {
    // 캐시 히트: 즉시 반영
    if (hasSnapshotCache) company.executiveSnapshot = cachedSnapshot.data;
    if (hasSurveyCache) {
      if (cachedSurvey.data.productOneLiner) company.productIntro = cachedSurvey.data.productOneLiner;
      if (cachedSurvey.data.batchGoal) company.yearMilestone = cachedSurvey.data.batchGoal;
    }
    console.log(`[perf] getCompanyAllData > AI 요약 캐시 히트: ${Date.now() - t2}ms`);
  }

  // 캐시 미스인 항목만 백그라운드에서 생성 (페이지 렌더를 차단하지 않음)
  if (!hasSnapshotCache && company.excel) {
    generateExecutiveSnapshot(company)
      .then((snap) => {
        if (snap) {
          // 캐시된 결과에도 반영 (다음 요청에서 사용)
          const cachedResult = companyDataCache.get(companyNotionPageId);
          if (cachedResult) {
            cachedResult.data.company.executiveSnapshot = snap;
          }
        }
      })
      .catch((err) => console.warn("[data] Executive Snapshot 백그라운드 생성 실패:", err));
  }
  if (!hasSurveyCache && surveyData) {
    summarizeSurveyText(companyNotionPageId, surveyData.productIntro, surveyData.yearMilestone)
      .then((summary) => {
        if (summary) {
          const cachedResult = companyDataCache.get(companyNotionPageId);
          if (cachedResult) {
            if (summary.productOneLiner) cachedResult.data.company.productIntro = summary.productOneLiner;
            if (summary.batchGoal) cachedResult.data.company.yearMilestone = summary.batchGoal;
          }
        }
      })
      .catch((err) => console.warn("[data] 설문 요약 백그라운드 생성 실패:", err));
  }

  // 타임라인을 로컬에서 조립 (getTimeline 내부 재호출 제거)
  const timeline: TimelineEvent[] = [];

  for (const s of sessions) {
    timeline.push({
      id: `notion-session-${s.notionPageId}`,
      companyId: companyNotionPageId,
      source: "notion",
      type: sessionToTimelineType(s.sessionTypes),
      date: s.date,
      title: s.title,
      rawContent: s.summary || "",
      metadata: {
        notionPageId: s.notionPageId,
        participants: [...(s.mentorIds || []), ...(s.pmIds || [])],
      },
    });
  }

  for (const r of expertRequests) {
    timeline.push({
      id: `notion-expert-${r.notionPageId}`,
      companyId: companyNotionPageId,
      source: "notion",
      type: "expert_request",
      date: r.requestedAt || "",
      title: `[${r.status || "접수"}] ${r.title}`,
      rawContent: [r.oneLiner, r.problem].filter(Boolean).join(" | "),
      metadata: {
        notionPageId: r.notionPageId,
      },
    });
  }

  // 날짜 내림차순 정렬
  timeline.sort((a, b) => b.date.localeCompare(a.date));

  const t3 = Date.now();
  const analyses = await getAnalysesByCompany(companyNotionPageId);
  console.log(`[perf] getCompanyAllData > analyses 조회: ${Date.now() - t3}ms (${analyses.length}건)`);

  // Notion API에서 반환된 데이터에 예상치 못한 객체 타입이 포함될 수 있으므로
  // JSON round-trip으로 직렬화 안전성을 보장 (React #310 근본 방지)
  const result = sanitizeForReact({ company, sessions, expertRequests, timeline, analyses });

  // 15분 캐시 (Notion API 부하 방지 + 연속 탐색 시 즉시 응답)
  companyDataCache.set(companyNotionPageId, {
    data: result,
    expires: Date.now() + 900_000,
  });

  console.log(`[perf] getCompanyAllData(${companyNotionPageId.slice(0,8)}): 전체 ${Date.now() - t0}ms`);
  return result;
}

// ══════════════════════════════════════════════════
// 브리핑 (로컬 JSON 저장)
// ══════════════════════════════════════════════════

export async function getBriefings(): Promise<CompanyBriefing[]> {
  if (useDB) return dbGetBriefings();
  return readJSON<CompanyBriefing>("briefings.json");
}

export async function getBriefingByCompany(
  companyId: string
): Promise<CompanyBriefing | undefined> {
  if (useDB) return dbGetBriefingByCompany(companyId);
  const briefings = await getBriefings();
  return briefings
    .filter((b) => b.companyId === companyId && b.status === "completed")
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0];
}

export async function saveBriefing(
  briefing: CompanyBriefing
): Promise<void> {
  if (useDB) return dbSaveBriefing(briefing);
  await withFileLock("briefings.json", async () => {
    const briefings = await readJSON<CompanyBriefing>("briefings.json");
    const idx = briefings.findIndex((b) => b.id === briefing.id);
    if (idx >= 0) {
      briefings[idx] = briefing;
    } else {
      briefings.push(briefing);
    }
    await writeJSON("briefings.json", briefings);
  });
}

/**
 * 브리핑 신선도 판단
 * stale 조건: 새 세션/전문가 요청 추가 또는 24시간 경과
 */
export function isBriefingStale(
  briefing: CompanyBriefing,
  currentData: {
    sessions: MentoringSession[];
    expertRequests: ExpertRequest[];
    analyses: AnalysisResult[];
    kptCount?: number;
    okrItemCount?: number;
    lastEditedTime?: string; // Notion DB 최신 수정 시간
  }
): { stale: boolean; reason?: string } {
  // 24시간 경과 체크
  const hoursSince =
    (Date.now() - new Date(briefing.createdAt).getTime()) / (1000 * 60 * 60);
  if (hoursSince > 24) {
    return { stale: true, reason: "마지막 브리핑 생성 후 24시간 이상 경과" };
  }

  const fp = briefing.dataFingerprint;

  // 새 세션 추가 여부
  if (currentData.sessions.length > fp.sessionCount) {
    return { stale: true, reason: `새로운 멘토링 세션 ${currentData.sessions.length - fp.sessionCount}건 추가됨` };
  }

  // 새 전문가 요청 추가 여부
  if (currentData.expertRequests.length > fp.expertRequestCount) {
    return { stale: true, reason: `새로운 전문가 요청 ${currentData.expertRequests.length - fp.expertRequestCount}건 추가됨` };
  }

  // 새 분석 추가 여부
  if (currentData.analyses.length > fp.analysisCount) {
    return { stale: true, reason: `새로운 AI 분석 ${currentData.analyses.length - fp.analysisCount}건 추가됨` };
  }

  // KPT / OKR 추가 여부
  if (currentData.kptCount !== undefined && currentData.kptCount > (fp.kptCount ?? 0)) {
    return { stale: true, reason: `새로운 KPT 회고 ${currentData.kptCount - (fp.kptCount ?? 0)}건 추가됨` };
  }
  if (currentData.okrItemCount !== undefined && currentData.okrItemCount > (fp.okrItemCount ?? 0)) {
    return { stale: true, reason: `OKR 지표 항목이 변경됨` };
  }

  // 최신 세션 날짜 변경 여부
  const latestSessionDate = currentData.sessions[0]?.date || null;
  if (latestSessionDate && latestSessionDate !== fp.lastSessionDate) {
    return { stale: true, reason: "최신 멘토링 세션 날짜가 변경됨" };
  }

  // Notion 데이터 수정 감지 (기존 세션/요청 내용이 변경된 경우)
  if (currentData.lastEditedTime && fp.lastEditedTime) {
    if (currentData.lastEditedTime > fp.lastEditedTime) {
      return { stale: true, reason: "Notion 데이터가 브리핑 이후 수정됨" };
    }
  }

  return { stale: false };
}

// ══════════════════════════════════════════════════
// Notion 함수 Re-export (페이지/컴포넌트에서 직접 사용)
// ══════════════════════════════════════════════════
export const getMentoringSessionWithTranscript = notionGetSessionWithTranscript;
export const getMentors = notionGetMentors;
export const getMentorsByCompany = notionGetMentorsByCompany;
export const getExpertRequests = notionGetExpertRequests;
export const getTimeline = notionGetTimeline;
export const extractPageText = notionExtractPageText;
export const clearCache = notionClearCache;
export const getKptReviews = notionGetKptReviews;
export const getOkrItems = notionGetOkrItems;
export const getOkrValues = notionGetOkrValues;

/**
 * 기업의 배치 대시보드 데이터 조회
 * batchLabel(예: "3기")로 해당 배치 OKR + 성장률 DB를 병렬 쿼리,
 * 기업 이름으로 필터링하여 해당 기업 데이터만 반환
 *
 * company 객체를 전달하면 Notion 재조회 없이 바로 사용 (성능 최적화)
 */
export async function getCompanyBatchDashboardData(
  companyIdOrCompany: string | Company
): Promise<BatchDashboardData | null> {
  // company 객체가 직접 전달되면 재조회 없이 사용
  const company = typeof companyIdOrCompany === "string"
    ? await notionGetCompany(companyIdOrCompany)
    : companyIdOrCompany;
  if (!company || !company.batchLabel) return null;

  const batchLabel = company.batchLabel;

  // OKR + 성장률 병렬 조회
  const [allOkr, allGrowth] = await Promise.all([
    notionGetBatchOkrData(batchLabel),
    notionGetBatchGrowthData(batchLabel),
  ]);

  // 기업 이름으로 필터링 (부분 일치)
  const companyName = company.name;
  const okrEntries = allOkr.filter(
    (e) => e.companyName === companyName || e.companyName.includes(companyName) || companyName.includes(e.companyName)
  );
  const growthEntries = allGrowth.filter(
    (e) => e.companyName === companyName || e.companyName.includes(companyName) || companyName.includes(e.companyName)
  );

  // 데이터가 하나도 없으면 null 반환
  if (okrEntries.length === 0 && growthEntries.length === 0) return null;

  // 블록 콘텐츠 병렬 조회 (각 OKR 페이지의 본문 텍스트)
  // 기존 8초 타임아웃 내에서 처리해야 하므로 개별 3초 타임아웃 적용
  await Promise.all(
    okrEntries
      .filter((e) => e.notionPageId)
      .map(async (entry) => {
        try {
          const text = await Promise.race([
            notionExtractPageText(entry.notionPageId!),
            new Promise<string>((_, reject) => setTimeout(() => reject(new Error("timeout")), 3000)),
          ]);
          if (text) entry.blockContent = text;
        } catch {
          // 개별 블록 조회 실패 시 무시 (속성 데이터만으로도 동작)
        }
      })
  );

  return { batchLabel, okrEntries, growthEntries };
}
