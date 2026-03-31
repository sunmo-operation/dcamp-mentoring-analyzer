// ══════════════════════════════════════════════════
// coaching-data.ts — 엑셀 코칭 기록 JSON 로더
// xlsx 파일에서 파싱된 coaching-records.json을 로드하여
// 기업명으로 조회 가능하게 매핑
// ══════════════════════════════════════════════════

import coachingRaw from "@/data/coaching-records.json";

// ── 코칭 기록 타입 정의 ─────────────────────────────

export interface CoachingPlan {
  expert: string;
  company: string;
  timeBudget: string;
  period: string;
  objective: string;
  teamRequest: string;
  expertPlan: string;
}

export interface CoachingSession {
  date: string;
  company: string;
  location: string;
  mentor: string;
  attendeesCompany: string;
  attendeesDcamp: string;
  issues: string;
  followUp: string;
  meetingUrl?: string;
}

export interface ExpertDeployment {
  date: string;
  company: string;
  expert: string;
  activity: string;
  note?: string;
  // 배치 3기/4기 확장 필드
  location?: string;
  attendeesCompany?: string;
  attendeesDcamp?: string;
  issues?: string;
  followUp?: string;
  type?: string;
}

export interface CoachingFeedback {
  date: string;
  name: string;
  company: string;
  satisfaction: number;
  topicReview: string;
  talkRatio: string;
  goodPoints: string;
  improvements: string;
  nextAgenda: string;
}

export interface MentoringJournal {
  date: string;
  title: string;
  preMeeting: string;
  duringMeeting: string;
  postMeeting: string;
}

export interface ProblemBacklogItem {
  date: string;
  problem: string;
  reason: string;
  targetMetric: string;
  category: string;
  status: string;
}

export interface ResourceConnection {
  period: string;
  company: string;
  category: string;
  status: string;
  item: string;
  detail: string;
  followUp?: string;
}

/** 기업 단위 코칭 기록 패키지 */
export interface CompanyCoachingRecords {
  coachingPlans: CoachingPlan[];
  sessions: CoachingSession[];
  expertDeployments: ExpertDeployment[];
  feedback: CoachingFeedback[];
  mentoringJournals: MentoringJournal[];
  kpiMonthly: string[];
  problemBacklog: ProblemBacklogItem[];
  resourceConnections: ResourceConnection[];
  survey: Record<string, string>;
  okr: string | null;
  batch?: string;
}

// ── 이름 정규화 (excel-data.ts와 동일 로직) ────────────

function normalizeName(name: string): string {
  return name
    .replace(/주식회사\s?/g, "")
    .replace(/\(주\)/g, "")
    .replace(/㈜/g, "")
    .replace(/\s/g, "")
    .toLowerCase();
}

// ── 기업명 → 코칭 데이터 매핑 (초기화 시 한 번만 빌드) ──

interface RawCompanyData {
  coachingPlans?: CoachingPlan[];
  sessions?: CoachingSession[];
  expertDeployments?: ExpertDeployment[];
  feedback?: CoachingFeedback[];
  mentoringJournals?: MentoringJournal[];
  kpiMonthly?: string[];
  problemBacklog?: ProblemBacklogItem[];
  resourceConnections?: ResourceConnection[];
  survey?: Record<string, string>;
  okr?: string | null;
  pmNotes?: string | number | null;
  batch?: string;
}

interface RawData {
  companies: Record<string, RawCompanyData>;
}

const data = coachingRaw as unknown as RawData;
const coachingMap = new Map<string, CompanyCoachingRecords>();

for (const [companyName, records] of Object.entries(data.companies)) {
  coachingMap.set(normalizeName(companyName), {
    coachingPlans: records.coachingPlans || [],
    sessions: records.sessions || [],
    expertDeployments: records.expertDeployments || [],
    feedback: records.feedback || [],
    mentoringJournals: records.mentoringJournals || [],
    kpiMonthly: records.kpiMonthly || [],
    problemBacklog: records.problemBacklog || [],
    resourceConnections: records.resourceConnections as ResourceConnection[] || [],
    survey: records.survey || {},
    okr: records.okr ?? null,
    batch: records.batch,
  });
}

/**
 * Notion 기업명으로 코칭 기록 조회
 * 정규화된 이름으로 퍼지 매칭 수행
 */
export function getCoachingRecordsByName(companyName: string): CompanyCoachingRecords | null {
  const norm = normalizeName(companyName);

  // 정확 매칭
  let records = coachingMap.get(norm);

  // 부분 매칭 (정확 매칭 실패 시)
  if (!records) {
    for (const [key, value] of coachingMap) {
      if (norm.includes(key) || key.includes(norm)) {
        records = value;
        break;
      }
    }
  }

  if (!records) return null;

  // 데이터가 하나도 없으면 null 반환
  const hasData =
    records.coachingPlans.length > 0 ||
    records.sessions.length > 0 ||
    records.expertDeployments.length > 0 ||
    records.feedback.length > 0 ||
    records.mentoringJournals.length > 0 ||
    records.problemBacklog.length > 0 ||
    Object.keys(records.survey).length > 0;

  return hasData ? records : null;
}
