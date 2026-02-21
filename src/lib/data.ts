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

/**
 * 기업의 모든 데이터를 통합 조회 (캐시 적용)
 * Notion API: company(1회) + sessions(1회) + expertRequests(1회) = 최대 3회
 * 캐시 히트 시 0회
 */
export async function getCompanyAllData(
  companyNotionPageId: string
): Promise<CompanyAllData | null> {
  // 캐시 확인
  const cached = companyDataCache.get(companyNotionPageId);
  if (cached && cached.expires > Date.now()) {
    return cached.data;
  }

  // 기업 정보 + 세션 + 전문가 요청을 모두 병렬 호출 (직렬 대기 제거)
  const [company, sessions, expertRequests] = await Promise.all([
    notionGetCompany(companyNotionPageId),
    notionGetSessions(companyNotionPageId).catch((error) => {
      console.warn("[data] 세션 조회 실패:", error);
      return [] as MentoringSession[];
    }),
    notionGetExpertRequests(companyNotionPageId).catch((error) => {
      console.warn("[data] 전문가 요청 조회 실패:", error);
      return [] as ExpertRequest[];
    }),
  ]);

  if (!company) return null;

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

  const analyses = await getAnalysesByCompany(companyNotionPageId);

  // Notion API에서 반환된 데이터에 예상치 못한 객체 타입이 포함될 수 있으므로
  // JSON round-trip으로 직렬화 안전성을 보장 (React #310 근본 방지)
  const result = sanitizeForReact({ company, sessions, expertRequests, timeline, analyses });

  // 3분 캐시 (브리핑 API 등에서 재호출 시 즉시 반환)
  companyDataCache.set(companyNotionPageId, {
    data: result,
    expires: Date.now() + 180_000,
  });

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

  return { batchLabel, okrEntries, growthEntries };
}
