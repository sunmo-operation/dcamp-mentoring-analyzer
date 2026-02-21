import { Client } from "@notionhq/client";
import type {
  Company,
  Mentor,
  MentoringSession,
  ExpertRequest,
  TimelineEvent,
  TimelineEventType,
  AnalysisResult,
  KptReview,
  OkrItem,
  OkrValue,
  BatchOkrEntry,
  BatchGrowthEntry,
} from "@/types";

// ── Notion 클라이언트 ──────────────────────────────
const notion = new Client({ auth: process.env.NOTION_API_KEY });

// ── Notion 속성명 상수 (한 곳에서 관리) ────────────
// Notion DB 필드명이 바뀌면 여기만 수정하면 됩니다.
const PROPS = {
  company: {
    id: "ID",
    name: "참여기업 명",
    description: "기업소개",
    website: "기업 웹사이트",
    foundedDate: "회사 설립일",
    teamSize: "총 임직원 수",
    investmentStage: "투자 단계",
    dealType: "거래 유형",
    serviceType: "서비스/제품 유형",
    productMaturity: "제품 성숙도 (TOBE)",
    techMaturity: "기술 성숙도 (TOBE)",
    marketSize: "시장 규모",
    customerScale: "고객 규모(ASIS)",
    growthStage: "성장 단계 (ASIS)",
    hasPatent: "특허/IP 보유",
    hasSerialFounder: "연쇄 창업자 보유",
    hasDomainExpert: "도메인 전문가 보유",
    hasFounderExp: "창업 경험자 보유",
    batchLabel: "배치 구분",
    batch: "배치",
    mentors: "담당 멘토",
    industry: "적용 산업 분야",
    representative: "대표자",
    surveyFeedback: "설문 피드백",
  },
  mentor: {
    id: "ID",
    name: "멘토 이름",
    nameEn: "멘토 이름 (영문)",
    type: "멘토 유형",
    company: "소속 기업 입력",
    position: "직책",
    bio: "주요 이력",
    linkedin: "링크드인 주소",
    expertise: "멘토링 분야",
    industry: "전문 산업 분야",
    relatedCompanies: "관련 기업",
  },
  session: {
    title: "회의 명",
    date: "회의 날짜",
    types: "회의구분",
    summary: "회의 내용 요약",
    followUp: "후속 조치 요약",
    duration: "미팅 진행 시간 (시간)",
    companies: "참석 기업",
    mentors: "참석 멘토",
    pms: "참석 PM",
    collaboUrl: "콜라보",
    tiroUrl: "티로",
  },
  expertRequest: {
    id: "ID",
    title: "전문가 요청서 명 (자동 생성)",
    status: "요청 상태",
    urgency: "긴급성",
    supportType: "지원 방식",
    oneLiner: "한 줄 요약",
    problem: "1. 해결할 문제",
    priorAttempts: "2. 선행 시도 및 결과 요약",
    coreQuestion: "3. 핵심 질문",
    desiredExpert: "4. 희망 분야 및 전문가",
    deliverableFormat: "5. 요청 산출물 형태",
    successMetric: "6. 핵심 성공 지표 및 목표",
    expectedImpact: "7. 예상 기여도 및 활용 계획",
    dueDate: "희망 완료일",
    requestedAt: "요청 일시",
    company: "요청 기업",
  },
  kpt: {
    company: "관련 기업",
    reviewDate: "회고일",
    keep: "[요약] Keep",
    problem: "[요약] Problem",
    try: "[요약] Try",
  },
  okrItem: {
    name: "성과지표 명",
    level: "구분",
    targetValue: "목표값",
    achieved: "달성",
    achievementRate: "달성율",
    deadline: "기한",
    company: "관련 기업",
    parent: "상위 지표",
  },
  okrValue: {
    currentValue: "현재값",
    targetValue: "목표값",
    period: "해당 기간",
    periodMonth: "기준 월",
    level: "지표 구분",
    company: "관련 기업",
    okrItem: "성과지표",
  },
  batch: {
    period: "운영 기간",
  },
  survey: {
    company: "00. 관련 참여기업",
    productIntro: "19. 제품/서비스 소개",
    revenueStructure: "44. 주요 매출 구성",
    yearMilestone: "55. 향후 1년 마일스톤",
    orgStatus: "13. 조직 현황 및 주요 인력 소개",
    dcampExpectation: "68. 기대 및 요청사항",
    valuation: "16. 투자 유치 현황 - 기업 가치 (Post value)",
  },
} as const;

// Notion DB IDs (환경변수)
const DB_IDS = {
  companies: process.env.NOTION_COMPANIES_DB_ID!,
  mentors: process.env.NOTION_MENTORS_DB_ID!,
  meetings: process.env.NOTION_MEETINGS_DB_ID!,
  expertRequests: process.env.NOTION_EXPERT_REQUESTS_DB_ID!,
  kptReviews: process.env.NOTION_KPT_DB_ID!,
  okrItems: process.env.NOTION_OKR_ITEMS_DB_ID!,
  okrValues: process.env.NOTION_OKR_VALUES_DB_ID!,
  surveyIt: process.env.NOTION_SURVEY_IT_DB_ID,
  representative: process.env.NOTION_REPRESENTATIVE_DB_ID,
  // 배치 대시보드 DB IDs
  batch3Okr: process.env.NOTION_BATCH3_OKR_DB_ID,
  batch3Growth: process.env.NOTION_BATCH3_GROWTH_DB_ID,
  batch4Kpi: process.env.NOTION_BATCH4_KPI_DB_ID,
  batch5Gallery: process.env.NOTION_BATCH5_GALLERY_DB_ID,
};

// ── 자동 재시도 (일시적 네트워크 오류 대응) ──────
async function withRetry<T>(
  fn: () => Promise<T>,
  options: { retries?: number; delay?: number; label?: string } = {}
): Promise<T> {
  const { retries = 2, delay = 1000, label = "API" } = options;
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        console.warn(`[notion] ${label} 재시도 (${attempt + 1}/${retries})...`);
        await new Promise(r => setTimeout(r, delay * (attempt + 1)));
      }
    }
  }
  throw lastError;
}

// ── 캐시 (TTL 기반 + Stale-on-error) ─────────────
// API 실패 시 만료된 캐시라도 반환하여 앱 크래시 방지
const cache = new Map<string, { data: unknown; expires: number }>();

function cached<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl = 300_000 // 기본 5분
): Promise<T> {
  const entry = cache.get(key);
  if (entry && entry.expires > Date.now()) {
    return Promise.resolve(entry.data as T);
  }
  return fetcher().then((data) => {
    cache.set(key, { data, expires: Date.now() + ttl });
    return data;
  }).catch((error) => {
    // Stale-on-error: API 실패 시 만료된 캐시라도 반환
    if (entry) {
      console.warn(`[notion] ${key}: API 실패 → 만료된 캐시 반환`);
      return entry.data as T;
    }
    throw error;
  });
}

export function clearCache(): void {
  cache.clear();
}

// ── Property 추출 헬퍼 ──────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Props = Record<string, any>;

function getTitle(props: Props, key: string): string {
  try {
    const prop = props?.[key];
    if (!prop || prop.type !== "title") return "";
    return prop.title?.map((t: { plain_text: string }) => t.plain_text).join("") ?? "";
  } catch { return ""; }
}

function getText(props: Props, key: string): string | undefined {
  try {
    const prop = props?.[key];
    if (!prop || prop.type !== "rich_text") return undefined;
    const text = prop.rich_text
      ?.map((t: { plain_text: string }) => t.plain_text)
      .join("");
    return text || undefined;
  } catch { return undefined; }
}

function getSelect(props: Props, key: string): string | undefined {
  try {
    const prop = props?.[key];
    if (!prop || prop.type !== "select" || !prop.select) return undefined;
    return prop.select.name;
  } catch { return undefined; }
}

function getMultiSelect(props: Props, key: string): string[] | undefined {
  try {
    const prop = props?.[key];
    if (!prop || prop.type !== "multi_select") return undefined;
    const items = prop.multi_select?.map((s: { name: string }) => s.name) ?? [];
    return items.length > 0 ? items : undefined;
  } catch { return undefined; }
}

function getNumber(props: Props, key: string): number | undefined {
  try {
    const prop = props?.[key];
    if (!prop || prop.type !== "number" || prop.number == null) return undefined;
    return prop.number;
  } catch { return undefined; }
}

function getDate(props: Props, key: string): string | undefined {
  try {
    const prop = props?.[key];
    if (!prop || prop.type !== "date" || !prop.date) return undefined;
    return prop.date.start || undefined;
  } catch { return undefined; }
}

function getDateEnd(props: Props, key: string): string | undefined {
  try {
    const prop = props?.[key];
    if (!prop || prop.type !== "date" || !prop.date) return undefined;
    return prop.date.end || undefined;
  } catch { return undefined; }
}

function getCheckbox(props: Props, key: string): boolean | undefined {
  try {
    const prop = props?.[key];
    if (!prop || prop.type !== "checkbox") return undefined;
    return prop.checkbox;
  } catch { return undefined; }
}

function getUrl(props: Props, key: string): string | undefined {
  try {
    const prop = props?.[key];
    if (!prop || prop.type !== "url" || !prop.url) return undefined;
    return prop.url;
  } catch { return undefined; }
}

function getRelationIds(props: Props, key: string): string[] {
  try {
    const prop = props?.[key];
    if (!prop || prop.type !== "relation") return [];
    return prop.relation?.map((r: { id: string }) => r.id) ?? [];
  } catch { return []; }
}

function getFormula(props: Props, key: string): string | number | undefined {
  try {
    const prop = props?.[key];
    if (!prop || prop.type !== "formula") return undefined;
    const f = prop.formula;
    if (!f) return undefined;
    if (f.type === "string") return f.string || undefined;
    if (f.type === "number") return f.number ?? undefined;
    if (f.type === "boolean") return f.boolean ? "true" : "false";
    if (f.type === "date") return f.date?.start || undefined;
    return undefined;
  } catch { return undefined; }
}

function getStatus(props: Props, key: string): string | undefined {
  try {
    const prop = props?.[key];
    if (!prop || prop.type !== "status" || !prop.status) return undefined;
    return prop.status.name;
  } catch { return undefined; }
}

function getCreatedTime(props: Props, key: string): string | undefined {
  try {
    const prop = props?.[key];
    if (!prop || prop.type !== "created_time") return undefined;
    return prop.created_time || undefined;
  } catch { return undefined; }
}

function getUniqueId(props: Props, key: string): number | undefined {
  try {
    const prop = props?.[key];
    if (!prop || prop.type !== "unique_id") return undefined;
    return prop.unique_id?.number ?? undefined;
  } catch { return undefined; }
}

// ── 안전한 배열 매핑 (개별 항목 실패 시 skip → 앱 크래시 방지) ──
function safeMap<T, R>(items: T[], mapper: (item: T) => R, label: string): R[] {
  const results: R[] = [];
  for (const item of items) {
    try {
      results.push(mapper(item));
    } catch (error) {
      const id = (item as Props)?.id ?? "unknown";
      console.warn(`[notion] ${label} 파싱 실패 (${id}):`, error);
    }
  }
  return results;
}

// ── 공통 헬퍼 ──────────────────────────────────────

// relation 배열 → 이름 배열 (각 페이지의 title property 조회, 캐싱)
async function resolveRelationNames(relationIds: string[]): Promise<string[]> {
  const names = await Promise.all(
    relationIds.map((id) =>
      cached(
        `page-title:${id}`,
        async () => {
          try {
            const page = (await withRetry(
              () => notion.pages.retrieve({ page_id: id }),
              { label: `페이지제목(${id.slice(0,8)})` }
            )) as Props;
            const props = (page?.properties ?? {}) as Props;
            for (const k of Object.keys(props)) {
              if (props[k]?.type === "title") {
                return getTitle(props, k);
              }
            }
            return "";
          } catch (error) {
            console.warn(`[notion] 페이지 제목 조회 실패 (${id}):`, error);
            return "";
          }
        },
        3_600_000 // 1시간 캐시 (페이지 제목은 거의 변하지 않음)
      )
    )
  );
  return names.filter((n) => n !== "");
}

// 페이지 본문 전체 텍스트 추출
export async function extractPageText(pageId: string): Promise<string> {
  const textBlocks: string[] = [];
  let cursor: string | undefined;

  const supportedTypes = new Set([
    "paragraph",
    "heading_1",
    "heading_2",
    "heading_3",
    "bulleted_list_item",
    "numbered_list_item",
    "toggle",
    "quote",
  ]);

  do {
    const response = await notion.blocks.children.list({
      block_id: pageId,
      start_cursor: cursor,
      page_size: 100,
    });

    for (const block of (response?.results ?? [])) {
      const b = block as Props;
      if (!b) continue;
      const type = b.type as string;

      if (supportedTypes.has(type)) {
        const richText = b[type]?.rich_text;
        if (richText) {
          const text = richText
            .map((t: { plain_text: string }) => t.plain_text)
            .join("");
          if (text) textBlocks.push(text);
        }
      }
    }

    cursor = response.has_more
      ? (response.next_cursor ?? undefined)
      : undefined;
  } while (cursor);

  return textBlocks.join("\n");
}

// 배치 시작일/종료일 2단계 조회 (TTL 1시간)
async function getBatchDates(
  batchPageId: string
): Promise<{ start?: string; end?: string }> {
  return cached(
    `batch-dates:${batchPageId}`,
    async () => {
      try {
        const page = (await withRetry(
          () => notion.pages.retrieve({ page_id: batchPageId }),
          { label: `배치날짜(${batchPageId.slice(0,8)})` }
        )) as Props;
        const props = page.properties as Props;
        return {
          start: getDate(props, PROPS.batch.period) || undefined,
          end: getDateEnd(props, PROPS.batch.period) || undefined,
        };
      } catch (error) {
        console.warn(`[notion] 배치 날짜 조회 실패 (${batchPageId}):`, error);
        return {};
      }
    },
    3_600_000 // 1시간
  );
}

// 페이지네이션 전체 조회
async function queryAllPages(
  databaseId: string,
  filter?: Parameters<typeof notion.databases.query>[0]["filter"],
  sorts?: Parameters<typeof notion.databases.query>[0]["sorts"]
): Promise<Props[]> {
  const pages: Props[] = [];
  let cursor: string | undefined;

  do {
    // 각 페이지네이션 호출에 자동 재시도 적용
    const response = await withRetry(
      () => notion.databases.query({
        database_id: databaseId,
        filter,
        sorts,
        start_cursor: cursor,
        page_size: 100,
      }),
      { label: "DB쿼리" }
    );

    const results = (response?.results ?? []) as Props[];
    pages.push(...results);
    cursor = response?.has_more
      ? (response.next_cursor ?? undefined)
      : undefined;
  } while (cursor);

  return pages;
}

// ══════════════════════════════════════════════════
// 기업 조회
// ══════════════════════════════════════════════════

function mapCompanyBase(page: Props) {
  const props = (page?.properties ?? {}) as Props;
  const P = PROPS.company;
  return {
    notionPageId: (page?.id ?? "") as string,
    id: getUniqueId(props, P.id) ?? 0,
    name: getTitle(props, P.name),
    description: getText(props, P.description),
    website: getUrl(props, P.website),
    foundedDate: getDate(props, P.foundedDate),
    teamSize: getNumber(props, P.teamSize),
    investmentStage: getSelect(props, P.investmentStage),
    dealType: getMultiSelect(props, P.dealType),
    serviceType: getMultiSelect(props, P.serviceType),
    productMaturity: getSelect(props, P.productMaturity),
    techMaturity: getSelect(props, P.techMaturity),
    marketSize: getSelect(props, P.marketSize),
    customerScaleRaw: getText(props, P.customerScale),
    growthStageRaw: getText(props, P.growthStage),
    hasPatent: getCheckbox(props, P.hasPatent),
    hasSerialFounder: getCheckbox(props, P.hasSerialFounder),
    hasDomainExpert: getCheckbox(props, P.hasDomainExpert),
    hasFounderExp: getCheckbox(props, P.hasFounderExp),
    batchLabel: getFormula(props, P.batchLabel) as string | undefined,
    batchId: getRelationIds(props, P.batch)[0],
    mentorIds: getRelationIds(props, P.mentors),
    _industryRelationIds: getRelationIds(props, P.industry),
    _representativeId: getRelationIds(props, P.representative)[0],
  };
}

async function enrichCompany(
  base: ReturnType<typeof mapCompanyBase>
): Promise<Company> {
  // 배치 시작일 + 배치 이름 2단계 조회
  let batchStartDate: string | undefined;
  let batchEndDate: string | undefined;
  let batchName: string | undefined;
  if (base.batchId) {
    const [dates, batchNames] = await Promise.all([
      getBatchDates(base.batchId),
      resolveRelationNames([base.batchId]),
    ]);
    batchStartDate = dates.start;
    batchEndDate = dates.end;
    batchName = batchNames[0] || undefined;
  }

  // 산업 분야 이름 + 대표자 이름 resolve (병렬)
  const [industryNames, ceoNames] = await Promise.all([
    base._industryRelationIds.length > 0
      ? resolveRelationNames(base._industryRelationIds)
      : Promise.resolve(undefined),
    base._representativeId
      ? resolveRelationNames([base._representativeId])
      : Promise.resolve(undefined),
  ]);
  const ceoName = ceoNames?.[0] || undefined;

  // 내부용 필드 제외
  const { _industryRelationIds, _representativeId, ...rest } = base;
  return { ...rest, batchStartDate, batchEndDate, batchName, industryNames, ceoName } as Company;
}

// 홈페이지용 경량 조회 (대표자 이름 + 배치 이름 resolve)
export async function getCompaniesBasic(): Promise<Company[]> {
  return cached(
    "companies:basic",
    async () => {
      const pages = await queryAllPages(DB_IDS.companies);
      const bases = safeMap(pages, mapCompanyBase, "기업(경량)");

      // 대표자 이름 + 배치 이름을 배치 resolve (홈 카드 + 기수별 그룹핑)
      const allRepIds = [
        ...new Set(bases.map((b) => b._representativeId).filter(Boolean)),
      ] as string[];
      const allBatchIds = [
        ...new Set(bases.map((b) => b.batchId).filter(Boolean)),
      ] as string[];
      await Promise.all([
        ...allRepIds.map((id) => resolveRelationNames([id])),
        ...allBatchIds.map((id) => resolveRelationNames([id])),
      ]);

      // 대표자 이름 + 배치 이름 매핑 후 내부 필드 제거
      const companies = await Promise.all(
        bases.map(async (base) => {
          const ceoName = base._representativeId
            ? (await resolveRelationNames([base._representativeId]))[0] || undefined
            : undefined;
          const batchName = base.batchId
            ? (await resolveRelationNames([base.batchId]))[0] || undefined
            : undefined;
          const { _industryRelationIds, _representativeId, ...rest } = base;
          return { ...rest, ceoName, batchName } as Company;
        })
      );
      return companies.sort((a, b) => a.id - b.id);
    },
    60_000 // 1분 캐시 (SWR이 클라이언트에서 프레시니스 관리)
  );
}

// 상세 페이지용 전체 조회 (enrichment 포함)
export async function getCompanies(): Promise<Company[]> {
  return cached(
    "companies:all",
    async () => {
      const pages = await queryAllPages(DB_IDS.companies);
      const bases = safeMap(pages, mapCompanyBase, "기업");

      // 모든 고유 relation ID를 수집하여 한번에 pre-fetch (N+1 → 병렬 배치)
      const allBatchIds = [
        ...new Set(bases.map((b) => b.batchId).filter(Boolean)),
      ] as string[];
      const allIndustryIds = [
        ...new Set(bases.flatMap((b) => b._industryRelationIds)),
      ];
      const allRepIds = [
        ...new Set(bases.map((b) => b._representativeId).filter(Boolean)),
      ] as string[];

      // 배치 정보 + 산업분야 이름 + 대표자 이름을 한번에 병렬 조회 (캐시 pre-warm)
      await Promise.all([
        ...allBatchIds.map((id) => getBatchDates(id)),
        ...allIndustryIds.map((id) => resolveRelationNames([id])),
        ...allRepIds.map((id) => resolveRelationNames([id])),
      ]);

      // 이제 enrichCompany 내부 호출은 모두 캐시 히트
      const companies = await Promise.all(bases.map(enrichCompany));
      return companies.sort((a, b) => a.id - b.id);
    },
    60_000 // 1분 캐시 (데이터 신선도 우선)
  );
}

export async function getCompany(
  notionPageId: string
): Promise<Company | undefined> {
  try {
    const page = (await withRetry(
      () => notion.pages.retrieve({ page_id: notionPageId }),
      { label: `기업(${notionPageId.slice(0,8)})` }
    )) as Props;
    return enrichCompany(mapCompanyBase(page));
  } catch (error) {
    console.warn(`[notion] 기업 조회 실패 (${notionPageId}):`, error);
    return undefined;
  }
}

// ══════════════════════════════════════════════════
// 멘토 조회
// ══════════════════════════════════════════════════

function mapMentor(page: Props): Mentor {
  const props = (page?.properties ?? {}) as Props;
  const P = PROPS.mentor;
  const expertiseRaw = getFormula(props, P.expertise) as string | undefined;
  const industryRaw = getFormula(props, P.industry) as string | undefined;

  return {
    notionPageId: (page?.id ?? "") as string,
    id: getUniqueId(props, P.id) ?? 0,
    name: getTitle(props, P.name),
    nameEn: getText(props, P.nameEn),
    mentorType: getSelect(props, P.type),
    company: getText(props, P.company),
    position: getText(props, P.position),
    bio: getText(props, P.bio),
    linkedin: getUrl(props, P.linkedin),
    expertiseAreas: expertiseRaw
      ? expertiseRaw
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : undefined,
    industries: industryRaw
      ? industryRaw
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : undefined,
    relatedCompanyIds: getRelationIds(props, P.relatedCompanies),
  };
}

export async function getMentors(): Promise<Mentor[]> {
  const pages = await queryAllPages(DB_IDS.mentors);
  return safeMap(pages, mapMentor, "멘토").sort((a, b) => a.id - b.id);
}

export async function getMentorsByCompany(
  companyNotionPageId: string
): Promise<Mentor[]> {
  const pages = await queryAllPages(DB_IDS.mentors, {
    property: PROPS.mentor.relatedCompanies,
    relation: { contains: companyNotionPageId },
  });
  return safeMap(pages, mapMentor, "멘토(기업별)");
}

// ══════════════════════════════════════════════════
// 회의록 (멘토링 세션) 조회
// ══════════════════════════════════════════════════

function mapSession(page: Props): MentoringSession {
  const props = (page?.properties ?? {}) as Props;
  const P = PROPS.session;
  return {
    notionPageId: (page?.id ?? "") as string,
    title: getTitle(props, P.title),
    date: getDate(props, P.date) || "",
    sessionTypes: getMultiSelect(props, P.types) || [],
    summary: getText(props, P.summary),
    followUp: getText(props, P.followUp),
    durationHours: getNumber(props, P.duration),
    companyIds: getRelationIds(props, P.companies),
    mentorIds: getRelationIds(props, P.mentors),
    pmIds: getRelationIds(props, P.pms),
    collaboUrl: getUrl(props, P.collaboUrl),
    tiroUrl: getUrl(props, P.tiroUrl),
    source: "notion",
  };
}

export async function getMentoringSessions(
  companyNotionPageId?: string
): Promise<MentoringSession[]> {
  const cacheKey = `sessions:${companyNotionPageId || "all"}`;
  return cached(cacheKey, async () => {
    const filter = companyNotionPageId
      ? {
          property: PROPS.session.companies,
          relation: { contains: companyNotionPageId },
        }
      : undefined;

    const pages = await queryAllPages(DB_IDS.meetings, filter, [
      { property: PROPS.session.date, direction: "descending" },
    ]);

    return safeMap(pages, mapSession, "세션");
  });
}

// 단일 세션 + 본문 텍스트 + 참석자 이름 resolve
export async function getMentoringSessionWithTranscript(
  sessionNotionPageId: string
): Promise<MentoringSession | undefined> {
  try {
    const page = (await withRetry(
      () => notion.pages.retrieve({ page_id: sessionNotionPageId }),
      { label: `세션(${sessionNotionPageId.slice(0,8)})` }
    )) as Props;
    const session = mapSession(page);

    // 병렬: 본문 추출 + 멘토 이름 + 기업 이름
    const [transcript, mentorNames, companyNames] = await Promise.all([
      extractPageText(sessionNotionPageId),
      session.mentorIds && session.mentorIds.length > 0
        ? resolveRelationNames(session.mentorIds)
        : Promise.resolve(undefined),
      session.companyIds.length > 0
        ? resolveRelationNames(session.companyIds)
        : Promise.resolve(undefined),
    ]);

    session.transcript = transcript;
    session.mentorNames = mentorNames || undefined;
    session.companyNames = companyNames || undefined;

    return session;
  } catch (error) {
    console.warn(`[notion] 세션 본문 추출 실패 (${sessionNotionPageId}):`, error);
    return undefined;
  }
}

// ══════════════════════════════════════════════════
// 전문가 리소스 요청 조회
// ══════════════════════════════════════════════════

function mapExpertRequest(page: Props): ExpertRequest {
  const props = (page?.properties ?? {}) as Props;
  const P = PROPS.expertRequest;
  return {
    notionPageId: (page?.id ?? "") as string,
    id: getUniqueId(props, P.id) ?? 0,
    title: getTitle(props, P.title),
    status: getStatus(props, P.status),
    urgency: getSelect(props, P.urgency),
    supportType: getMultiSelect(props, P.supportType),
    oneLiner: getText(props, P.oneLiner),
    problem: getText(props, P.problem),
    priorAttempts: getText(props, P.priorAttempts),
    coreQuestion: getText(props, P.coreQuestion),
    desiredExpert: getText(props, P.desiredExpert),
    deliverableFormat: getText(props, P.deliverableFormat),
    successMetric: getText(props, P.successMetric),
    expectedImpact: getText(props, P.expectedImpact),
    dueDate: getDate(props, P.dueDate),
    requestedAt: getCreatedTime(props, P.requestedAt),
    companyId: getRelationIds(props, P.company)[0],
  };
}

export async function getExpertRequests(
  companyNotionPageId?: string
): Promise<ExpertRequest[]> {
  const cacheKey = `expert-requests:${companyNotionPageId || "all"}`;
  return cached(cacheKey, async () => {
    const filter = companyNotionPageId
      ? {
          property: PROPS.expertRequest.company,
          relation: { contains: companyNotionPageId },
        }
      : undefined;

    const pages = await queryAllPages(DB_IDS.expertRequests, filter);

    // 요청 일시 내림차순 정렬
    return safeMap(pages, mapExpertRequest, "전문가요청").sort((a, b) => {
      const dateA = a.requestedAt || "";
      const dateB = b.requestedAt || "";
      return dateB.localeCompare(dateA);
    });
  });
}

// ══════════════════════════════════════════════════
// 타임라인 통합
// ══════════════════════════════════════════════════

export function sessionToTimelineType(sessionTypes: string[]): TimelineEventType {
  if (sessionTypes.some((t) => ["멘토", "전문가투입"].includes(t)))
    return "mentoring";
  if (sessionTypes.some((t) => ["점검", "체크업", "회고"].includes(t)))
    return "checkpoint";
  return "meeting";
}

export async function getTimeline(
  companyNotionPageId: string
): Promise<TimelineEvent[]> {
  // 병렬 조회: 회의록 + 전문가 요청
  const [sessions, expertRequests] = await Promise.all([
    getMentoringSessions(companyNotionPageId),
    getExpertRequests(companyNotionPageId),
  ]);

  const events: TimelineEvent[] = [];

  // 회의록 → 타임라인 이벤트
  for (const s of sessions) {
    events.push({
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

  // 전문가 요청 → 타임라인 이벤트
  for (const r of expertRequests) {
    events.push({
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
  return events.sort((a, b) => b.date.localeCompare(a.date));
}

// ══════════════════════════════════════════════════
// 분석 결과 Notion 저장
// ══════════════════════════════════════════════════

// ══════════════════════════════════════════════════
// KPT 회고 조회
// ══════════════════════════════════════════════════

function mapKptReview(page: Props): KptReview {
  const props = (page?.properties ?? {}) as Props;
  const P = PROPS.kpt;
  return {
    notionPageId: (page?.id ?? "") as string,
    companyId: getRelationIds(props, P.company)[0],
    reviewDate: getDate(props, P.reviewDate),
    keep: getText(props, P.keep),
    problem: getText(props, P.problem),
    try: getText(props, P.try),
  };
}

export async function getKptReviews(
  companyNotionPageId?: string
): Promise<KptReview[]> {
  const cacheKey = `kpt-reviews:${companyNotionPageId || "all"}`;
  return cached(cacheKey, async () => {
    try {
      const filter = companyNotionPageId
        ? {
            property: PROPS.kpt.company,
            relation: { contains: companyNotionPageId },
          }
        : undefined;

      const pages = await queryAllPages(DB_IDS.kptReviews, filter, [
        { property: PROPS.kpt.reviewDate, direction: "ascending" as const },
      ]);

      return safeMap(pages, mapKptReview, "KPT회고");
    } catch (error) {
      console.warn("[notion] KPT 회고 조회 실패:", error);
      return [];
    }
  });
}

// ══════════════════════════════════════════════════
// OKR 성과지표 항목 조회
// ══════════════════════════════════════════════════

function mapOkrItem(page: Props): OkrItem {
  const props = (page?.properties ?? {}) as Props;
  const P = PROPS.okrItem;
  return {
    notionPageId: (page?.id ?? "") as string,
    name: getTitle(props, P.name),
    level: getSelect(props, P.level) || "",
    targetValue: getNumber(props, P.targetValue),
    achieved: getCheckbox(props, P.achieved),
    achievementRate: getFormula(props, P.achievementRate),
    deadline: getDate(props, P.deadline),
    companyId: getRelationIds(props, P.company)[0],
    parentId: getRelationIds(props, P.parent)[0],
  };
}

export async function getOkrItems(
  companyNotionPageId: string
): Promise<OkrItem[]> {
  const cacheKey = `okr-items:${companyNotionPageId}`;
  return cached(cacheKey, async () => {
    try {
      const pages = await queryAllPages(DB_IDS.okrItems, {
        property: PROPS.okrItem.company,
        relation: { contains: companyNotionPageId },
      });

      return safeMap(pages, mapOkrItem, "OKR항목");
    } catch (error) {
      console.warn("[notion] OKR 항목 조회 실패:", error);
      return [];
    }
  });
}

// ══════════════════════════════════════════════════
// OKR 성과지표 측정값 조회
// ══════════════════════════════════════════════════

function mapOkrValue(page: Props): OkrValue {
  const props = (page?.properties ?? {}) as Props;
  const P = PROPS.okrValue;
  return {
    notionPageId: (page?.id ?? "") as string,
    currentValue: getNumber(props, P.currentValue),
    targetValue: getFormula(props, P.targetValue) as string | undefined,
    period: getDate(props, P.period),
    periodMonth: getFormula(props, P.periodMonth) as string | undefined,
    level: getFormula(props, P.level) as string | undefined,
    companyId: getRelationIds(props, P.company)[0],
    okrItemId: getRelationIds(props, P.okrItem)[0],
  };
}

export async function getOkrValues(
  companyNotionPageId: string
): Promise<OkrValue[]> {
  const cacheKey = `okr-values:${companyNotionPageId}`;
  return cached(cacheKey, async () => {
    try {
      const pages = await queryAllPages(
        DB_IDS.okrValues,
        {
          property: PROPS.okrValue.company,
          relation: { contains: companyNotionPageId },
        },
        [{ property: PROPS.okrValue.period, direction: "ascending" as const }]
      );

      return safeMap(pages, mapOkrValue, "OKR측정값");
    } catch (error) {
      console.warn("[notion] OKR 측정값 조회 실패:", error);
      return [];
    }
  });
}

// ══════════════════════════════════════════════════
// 분석 결과 Notion 저장
// ══════════════════════════════════════════════════

// ══════════════════════════════════════════════════
// 배치 대시보드 조회 (3기/4기/5기)
// ══════════════════════════════════════════════════

// 배치 번호 → OKR DB ID 매핑
function getBatchOkrDbId(batchLabel: string): string | undefined {
  // "3기", "4기", "5기" 등에서 숫자 추출
  const match = batchLabel.match(/(\d+)/);
  if (!match) return undefined;
  const num = match[1];
  if (num === "3") return DB_IDS.batch3Okr;
  if (num === "4") return DB_IDS.batch4Kpi;
  // 5기는 갤러리 형태이므로 OKR DB 없음
  return undefined;
}

// 배치 번호 → 성장률 DB ID 매핑
function getBatchGrowthDbId(batchLabel: string): string | undefined {
  const match = batchLabel.match(/(\d+)/);
  if (!match) return undefined;
  const num = match[1];
  if (num === "3") return DB_IDS.batch3Growth;
  // 4기/5기는 별도 성장률 DB 없음
  return undefined;
}

/**
 * 배치 OKR 달성율 데이터 조회
 * DB 필드: title(기업명), 텍스트(오브젝티브), 숫자(현재값/목표값)
 */
export async function getBatchOkrData(batchLabel: string): Promise<BatchOkrEntry[]> {
  const dbId = getBatchOkrDbId(batchLabel);
  if (!dbId) return [];

  const cacheKey = `batch-okr:${batchLabel}`;
  return cached(cacheKey, async () => {
    try {
      const pages = await queryAllPages(dbId);
      return safeMap(pages, (page) => {
        const props = (page?.properties ?? {}) as Props;
        // 속성명 탐색: title 타입 → 기업명, 나머지는 이름 기반
        let companyName = "";
        let objective = "";
        let currentValue: number | null = null;
        let targetValue: number | null = null;

        for (const [key, val] of Object.entries(props)) {
          if (!val || !val.type) continue;
          if (val.type === "title") {
            companyName = getTitle(props, key);
          } else if (val.type === "rich_text" && !objective) {
            objective = getText(props, key) || "";
          } else if (val.type === "number") {
            const lowerKey = key.toLowerCase();
            if (lowerKey.includes("현재") || lowerKey.includes("current")) {
              currentValue = getNumber(props, key) ?? null;
            } else if (lowerKey.includes("목표") || lowerKey.includes("target")) {
              targetValue = getNumber(props, key) ?? null;
            } else if (currentValue === null) {
              currentValue = getNumber(props, key) ?? null;
            } else if (targetValue === null) {
              targetValue = getNumber(props, key) ?? null;
            }
          }
        }

        return { companyName, objective, currentValue, targetValue, notionPageId: (page?.id ?? "") as string };
      }, "배치OKR").filter((entry) => entry.companyName !== "");
    } catch (error) {
      console.warn(`[notion] 배치 OKR 조회 실패 (${batchLabel}):`, error);
      return [];
    }
  }, 600_000); // 10분 캐시 (배치 데이터는 자주 변하지 않음)
}

/**
 * 배치 전월 대비 성장률 데이터 조회
 */
export async function getBatchGrowthData(batchLabel: string): Promise<BatchGrowthEntry[]> {
  const dbId = getBatchGrowthDbId(batchLabel);
  if (!dbId) return [];

  const cacheKey = `batch-growth:${batchLabel}`;
  return cached(cacheKey, async () => {
    try {
      const pages = await queryAllPages(dbId);
      return safeMap(pages, (page) => {
        const props = (page?.properties ?? {}) as Props;
        let companyName = "";
        let metric = "";
        let previousMonth: string | null = null;
        let currentMonth: number | null = null;
        let growthRate: number | null = null;

        for (const [key, val] of Object.entries(props)) {
          if (!val || !val.type) continue;
          if (val.type === "title") {
            companyName = getTitle(props, key);
          } else if (val.type === "rich_text" && !metric) {
            metric = getText(props, key) || "";
          } else if (val.type === "number") {
            const lowerKey = key.toLowerCase();
            if (lowerKey.includes("성장") || lowerKey.includes("growth") || lowerKey.includes("증감")) {
              growthRate = getNumber(props, key) ?? null;
            } else if (lowerKey.includes("이번") || lowerKey.includes("current") || lowerKey.includes("당월")) {
              currentMonth = getNumber(props, key) ?? null;
            }
          } else if (val.type === "formula") {
            const lowerKey = key.toLowerCase();
            if (lowerKey.includes("성장") || lowerKey.includes("growth") || lowerKey.includes("증감")) {
              const formulaVal = getFormula(props, key);
              if (typeof formulaVal === "number") growthRate = formulaVal;
            } else if (lowerKey.includes("전월") || lowerKey.includes("previous")) {
              const formulaVal = getFormula(props, key);
              previousMonth = formulaVal !== undefined ? String(formulaVal) : null;
            }
          }
        }

        return { companyName, metric, previousMonth, currentMonth, growthRate };
      }, "배치성장률").filter((entry) => entry.companyName !== "");
    } catch (error) {
      console.warn(`[notion] 배치 성장률 조회 실패 (${batchLabel}):`, error);
      return [];
    }
  }, 600_000); // 10분 캐시
}

// ══════════════════════════════════════════════════
// 경량 프레시니스 체크 (last_edited_time 기반)
// ══════════════════════════════════════════════════

/**
 * 노션 DB의 최근 수정 시간을 경량으로 조회
 * page_size=1로 최소 페이로드, last_edited_time 메타데이터만 활용
 * → 변경 감지 후 필요할 때만 전체 데이터 리페치
 */
export async function getLastEditedTime(
  scope: "companies" | "company-detail",
  companyId?: string
): Promise<string | null> {
  try {
    if (scope === "companies") {
      const response = await notion.databases.query({
        database_id: DB_IDS.companies,
        sorts: [{ timestamp: "last_edited_time", direction: "descending" }],
        page_size: 1,
      });
      return (response.results[0] as Props)?.last_edited_time ?? null;
    }

    if (scope === "company-detail" && companyId) {
      // 회의록 + 전문가요청 DB 병렬 체크 (가장 자주 변하는 데이터)
      const [meetingsRes, expertRes] = await Promise.all([
        notion.databases.query({
          database_id: DB_IDS.meetings,
          filter: { property: PROPS.session.companies, relation: { contains: companyId } },
          sorts: [{ timestamp: "last_edited_time", direction: "descending" }],
          page_size: 1,
        }),
        notion.databases.query({
          database_id: DB_IDS.expertRequests,
          filter: { property: PROPS.expertRequest.company, relation: { contains: companyId } },
          sorts: [{ timestamp: "last_edited_time", direction: "descending" }],
          page_size: 1,
        }),
      ]);

      const times = [
        (meetingsRes.results[0] as Props)?.last_edited_time,
        (expertRes.results[0] as Props)?.last_edited_time,
      ].filter(Boolean) as string[];

      // 가장 최근 수정 시간 반환
      return times.length > 0 ? times.sort().pop()! : null;
    }

    return null;
  } catch (error) {
    console.warn("[notion] 최신 수정 시간 조회 실패:", error);
    return null;
  }
}

// ══════════════════════════════════════════════════
// 분석 결과 Notion 저장
// ══════════════════════════════════════════════════

// ══════════════════════════════════════════════════
// 사전 설문 데이터 조회
// ══════════════════════════════════════════════════

interface SurveyData {
  productIntro?: string;
  revenueStructure?: string;
  yearMilestone?: string;
  orgStatus?: string;
  dcampExpectation?: string;
  valuation?: number;
}

/**
 * 기업의 사전 설문 응답 데이터 조회
 * 사전 설문 IT DB를 `00. 관련 참여기업` 필터로 쿼리하여
 * 해당 기업의 설문 응답에서 핵심 필드를 추출
 */
export async function getCompanySurveyData(
  companyNotionPageId: string
): Promise<SurveyData | null> {
  if (!DB_IDS.surveyIt) return null;

  const cacheKey = `survey:${companyNotionPageId}`;
  return cached(
    cacheKey,
    async () => {
      try {
        const P = PROPS.survey;
        const pages = await queryAllPages(DB_IDS.surveyIt!, {
          property: P.company,
          relation: { contains: companyNotionPageId },
        });

        if (pages.length === 0) return null;

        // 첫 번째 설문 응답 사용 (일반적으로 1개)
        const props = (pages[0]?.properties ?? {}) as Props;
        return {
          productIntro: getText(props, P.productIntro),
          revenueStructure: getText(props, P.revenueStructure),
          yearMilestone: getText(props, P.yearMilestone),
          orgStatus: getText(props, P.orgStatus),
          dcampExpectation: getText(props, P.dcampExpectation),
          valuation: getNumber(props, P.valuation),
        };
      } catch (error) {
        console.warn(`[notion] 사전 설문 조회 실패 (${companyNotionPageId}):`, error);
        return null;
      }
    },
    3_600_000 // 1시간 캐시 (설문 데이터는 자주 안 바뀜)
  );
}

export async function saveAnalysisToNotion(
  sessionPageId: string,
  analysis: AnalysisResult
): Promise<void> {
  const dateStr = new Date(analysis.createdAt).toISOString().split("T")[0];
  const sectionsJson = JSON.stringify(analysis.sections, null, 2);
  // Notion code 블록 최대 2000자 제한 대응
  const truncated =
    sectionsJson.length > 2000
      ? sectionsJson.slice(0, 1997) + "..."
      : sectionsJson;

  await notion.blocks.children.append({
    block_id: sessionPageId,
    children: [
      {
        object: "block" as const,
        type: "heading_2" as const,
        heading_2: {
          rich_text: [
            {
              type: "text" as const,
              text: { content: `AI 분석 결과 (${dateStr})` },
            },
          ],
        },
      },
      {
        object: "block" as const,
        type: "code" as const,
        code: {
          rich_text: [
            {
              type: "text" as const,
              text: { content: truncated },
            },
          ],
          language: "json" as const,
        },
      },
    ],
  });
}
