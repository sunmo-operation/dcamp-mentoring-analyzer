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
};

// ── 캐시 (TTL 기반 메모리 캐시) ──────────────────
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
  });
}

export function clearCache(): void {
  cache.clear();
}

// ── Property 추출 헬퍼 ──────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Props = Record<string, any>;

function getTitle(props: Props, key: string): string {
  const prop = props[key];
  if (!prop || prop.type !== "title") return "";
  return prop.title?.map((t: { plain_text: string }) => t.plain_text).join("") || "";
}

function getText(props: Props, key: string): string | undefined {
  const prop = props[key];
  if (!prop || prop.type !== "rich_text") return undefined;
  const text = prop.rich_text
    ?.map((t: { plain_text: string }) => t.plain_text)
    .join("");
  return text || undefined;
}

function getSelect(props: Props, key: string): string | undefined {
  const prop = props[key];
  if (!prop || prop.type !== "select" || !prop.select) return undefined;
  return prop.select.name;
}

function getMultiSelect(props: Props, key: string): string[] | undefined {
  const prop = props[key];
  if (!prop || prop.type !== "multi_select") return undefined;
  const items = prop.multi_select?.map((s: { name: string }) => s.name) || [];
  return items.length > 0 ? items : undefined;
}

function getNumber(props: Props, key: string): number | undefined {
  const prop = props[key];
  if (!prop || prop.type !== "number" || prop.number === null) return undefined;
  return prop.number;
}

function getDate(props: Props, key: string): string | undefined {
  const prop = props[key];
  if (!prop || prop.type !== "date" || !prop.date) return undefined;
  return prop.date.start || undefined;
}

function getDateEnd(props: Props, key: string): string | undefined {
  const prop = props[key];
  if (!prop || prop.type !== "date" || !prop.date) return undefined;
  return prop.date.end || undefined;
}

function getCheckbox(props: Props, key: string): boolean | undefined {
  const prop = props[key];
  if (!prop || prop.type !== "checkbox") return undefined;
  return prop.checkbox;
}

function getUrl(props: Props, key: string): string | undefined {
  const prop = props[key];
  if (!prop || prop.type !== "url" || !prop.url) return undefined;
  return prop.url;
}

function getRelationIds(props: Props, key: string): string[] {
  const prop = props[key];
  if (!prop || prop.type !== "relation") return [];
  return prop.relation?.map((r: { id: string }) => r.id) || [];
}

function getFormula(props: Props, key: string): string | number | undefined {
  const prop = props[key];
  if (!prop || prop.type !== "formula") return undefined;
  const f = prop.formula;
  if (f.type === "string") return f.string || undefined;
  if (f.type === "number") return f.number ?? undefined;
  if (f.type === "boolean") return f.boolean ? "true" : "false";
  if (f.type === "date") return f.date?.start || undefined;
  return undefined;
}

function getStatus(props: Props, key: string): string | undefined {
  const prop = props[key];
  if (!prop || prop.type !== "status" || !prop.status) return undefined;
  return prop.status.name;
}

function getCreatedTime(props: Props, key: string): string | undefined {
  const prop = props[key];
  if (!prop || prop.type !== "created_time") return undefined;
  return prop.created_time || undefined;
}

function getUniqueId(props: Props, key: string): number | undefined {
  const prop = props[key];
  if (!prop || prop.type !== "unique_id") return undefined;
  return prop.unique_id?.number ?? undefined;
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
            const page = (await notion.pages.retrieve({ page_id: id })) as Props;
            const props = page.properties as Props;
            for (const k of Object.keys(props)) {
              if (props[k].type === "title") {
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

    for (const block of response.results) {
      const b = block as Props;
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
        const page = (await notion.pages.retrieve({
          page_id: batchPageId,
        })) as Props;
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
    const response = await notion.databases.query({
      database_id: databaseId,
      filter,
      sorts,
      start_cursor: cursor,
      page_size: 100,
    });

    pages.push(...(response.results as Props[]));
    cursor = response.has_more
      ? (response.next_cursor ?? undefined)
      : undefined;
  } while (cursor);

  return pages;
}

// ══════════════════════════════════════════════════
// 기업 조회
// ══════════════════════════════════════════════════

function mapCompanyBase(page: Props) {
  const props = page.properties as Props;
  const P = PROPS.company;
  return {
    notionPageId: page.id as string,
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
  };
}

async function enrichCompany(
  base: ReturnType<typeof mapCompanyBase>
): Promise<Company> {
  // 배치 시작일 2단계 조회
  let batchStartDate: string | undefined;
  let batchEndDate: string | undefined;
  if (base.batchId) {
    const dates = await getBatchDates(base.batchId);
    batchStartDate = dates.start;
    batchEndDate = dates.end;
  }

  // 산업 분야 이름 resolve
  const industryNames =
    base._industryRelationIds.length > 0
      ? await resolveRelationNames(base._industryRelationIds)
      : undefined;

  // _industryRelationIds는 내부용이므로 제외
  const { _industryRelationIds, ...rest } = base;
  return { ...rest, batchStartDate, batchEndDate, industryNames } as Company;
}

// 홈페이지용 경량 조회 (enrichment 없이 DB 쿼리 1회로 완료)
export async function getCompaniesBasic(): Promise<Company[]> {
  return cached(
    "companies:basic",
    async () => {
      const pages = await queryAllPages(DB_IDS.companies);
      return pages
        .map((page) => {
          const base = mapCompanyBase(page);
          const { _industryRelationIds, ...rest } = base;
          return rest as Company;
        })
        .sort((a, b) => a.id - b.id);
    },
    300_000 // 5분 캐시
  );
}

// 상세 페이지용 전체 조회 (enrichment 포함)
export async function getCompanies(): Promise<Company[]> {
  return cached(
    "companies:all",
    async () => {
      const pages = await queryAllPages(DB_IDS.companies);
      const bases = pages.map(mapCompanyBase);

      // 모든 고유 relation ID를 수집하여 한번에 pre-fetch (N+1 → 병렬 배치)
      const allBatchIds = [
        ...new Set(bases.map((b) => b.batchId).filter(Boolean)),
      ] as string[];
      const allIndustryIds = [
        ...new Set(bases.flatMap((b) => b._industryRelationIds)),
      ];

      // 배치 정보 + 산업분야 이름을 한번에 병렬 조회 (캐시 pre-warm)
      await Promise.all([
        ...allBatchIds.map((id) => getBatchDates(id)),
        ...allIndustryIds.map((id) => resolveRelationNames([id])),
      ]);

      // 이제 enrichCompany 내부 호출은 모두 캐시 히트
      const companies = await Promise.all(bases.map(enrichCompany));
      return companies.sort((a, b) => a.id - b.id);
    },
    300_000 // 5분 캐시
  );
}

export async function getCompany(
  notionPageId: string
): Promise<Company | undefined> {
  try {
    const page = (await notion.pages.retrieve({
      page_id: notionPageId,
    })) as Props;
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
  const props = page.properties as Props;
  const P = PROPS.mentor;
  const expertiseRaw = getFormula(props, P.expertise) as string | undefined;
  const industryRaw = getFormula(props, P.industry) as string | undefined;

  return {
    notionPageId: page.id as string,
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
  return pages.map(mapMentor).sort((a, b) => a.id - b.id);
}

export async function getMentorsByCompany(
  companyNotionPageId: string
): Promise<Mentor[]> {
  const pages = await queryAllPages(DB_IDS.mentors, {
    property: PROPS.mentor.relatedCompanies,
    relation: { contains: companyNotionPageId },
  });
  return pages.map(mapMentor);
}

// ══════════════════════════════════════════════════
// 회의록 (멘토링 세션) 조회
// ══════════════════════════════════════════════════

function mapSession(page: Props): MentoringSession {
  const props = page.properties as Props;
  const P = PROPS.session;
  return {
    notionPageId: page.id as string,
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

    return pages.map(mapSession);
  });
}

// 단일 세션 + 본문 텍스트 + 참석자 이름 resolve
export async function getMentoringSessionWithTranscript(
  sessionNotionPageId: string
): Promise<MentoringSession | undefined> {
  try {
    const page = (await notion.pages.retrieve({
      page_id: sessionNotionPageId,
    })) as Props;
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
  const props = page.properties as Props;
  const P = PROPS.expertRequest;
  return {
    notionPageId: page.id as string,
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
    return pages.map(mapExpertRequest).sort((a, b) => {
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
  const props = page.properties as Props;
  const P = PROPS.kpt;
  return {
    notionPageId: page.id as string,
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

      return pages.map(mapKptReview);
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
  const props = page.properties as Props;
  const P = PROPS.okrItem;
  return {
    notionPageId: page.id as string,
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

      return pages.map(mapOkrItem);
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
  const props = page.properties as Props;
  const P = PROPS.okrValue;
  return {
    notionPageId: page.id as string,
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

      return pages.map(mapOkrValue);
    } catch (error) {
      console.warn("[notion] OKR 측정값 조회 실패:", error);
      return [];
    }
  });
}

// ══════════════════════════════════════════════════
// 분석 결과 Notion 저장
// ══════════════════════════════════════════════════

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
