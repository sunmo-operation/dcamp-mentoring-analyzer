// ══════════════════════════════════════════════════
// D.CAMP 멘토링 분석기 — Notion 연동 타입 정의
// ══════════════════════════════════════════════════

// ── 기업 ──────────────────────────────────────────
export interface Company {
  notionPageId: string;
  id: number; // auto_increment_id
  name: string; // 참여기업 명
  description?: string; // 기업소개
  website?: string; // 기업 웹사이트
  foundedDate?: string; // 회사 설립일
  teamSize?: number; // 총 임직원 수
  investmentStage?: string; // 투자 단계
  dealType?: string[]; // 거래 유형 (B2C, B2B 등)
  serviceType?: string[]; // 서비스/제품 유형
  productMaturity?: string; // 제품 성숙도 (TOBE)
  techMaturity?: string; // 기술 성숙도 (TOBE)
  marketSize?: string; // 시장 규모
  customerScaleRaw?: string; // 고객 규모 (ASIS)
  growthStageRaw?: string; // 성장 단계 (ASIS)
  hasPatent?: boolean; // 특허/IP 보유
  hasSerialFounder?: boolean; // 연쇄 창업자 보유
  hasDomainExpert?: boolean; // 도메인 전문가 보유
  hasFounderExp?: boolean; // 창업 경험자 보유
  batchLabel?: string; // 배치 구분 (formula) — 프로그램 유형 (딥테크/IT 등)
  batchName?: string; // 배치 이름 (relation title) — 기수 (3기/4기 등)
  batchId?: string; // 배치 relation pageId
  batchStartDate?: string; // 기수 시작일 (2단계 조회)
  batchEndDate?: string; // 기수 종료일
  industryNames?: string[]; // 적용 산업 분야 (relation → name)
  mentorIds?: string[]; // 담당 멘토 (relation pageIds)
  achievementRate?: number; // 달성율 (formula)
  slackChannelId?: string; // Slack 채널 ID (수동 매핑)
  // 사전 설문 + 대표자 연동 필드
  ceoName?: string; // 대표자 이름
  productIntro?: string; // 제품/서비스 소개 (BM)
  revenueStructure?: string; // 주요 매출 구성 (수익모델)
  yearMilestone?: string; // 향후 1년 마일스톤
  orgStatus?: string; // 조직 현황 및 주요 인력
  dcampExpectation?: string; // 디캠프 기대/요청사항
  valuation?: number; // 기업 가치 (Post value, 원)
  // 엑셀 마스터 시트 연동 필드
  excel?: ExcelEnrichedData;
  executiveSnapshot?: ExecutiveSnapshot;
}

// ── 기업 엑셀 사전설문 AI 요약 (맥킨지 스타일) ────
export interface ExecutiveSnapshot {
  ceoName: string; // 대표자명
  productSummary: string; // 제품/서비스 소개 요약
  investmentSummary: string; // 투자 현황 요약
  batchGoal: string; // 배치 기간 핵심 목표
  moat: string; // 핵심 차별성/해자
  idealVision: string; // 이상적 성공 모습
}

// ── 엑셀 마스터 시트 보강 데이터 ─────────────────
export interface ExcelEnrichedData {
  // 참여기업정보
  managementId?: string; // 관리번호
  participationDate?: string; // 참여일자
  graduationDate?: string; // 졸업일자
  pmPrimary?: string; // PM(정)
  pmSecondary?: string; // PM(부)
  dedicatedMentor?: string; // 전담멘토
  expertMentor?: string; // 전문가멘토
  staff?: string; // 실무진
  email?: string; // 이메일
  phone?: string; // 연락처
  field?: string; // 분야
  // 투자현황
  investment?: ExcelInvestmentData;
  // 사전설문
  survey?: ExcelSurveyData;
}

export interface ExcelInvestmentData {
  fundingStatus?: string; // 최근 펀딩 현황
  latestRound?: string; // 최근 라운드
  preMoneyValuation?: string; // Pre-money Valuation
  latestFundingAmount?: string; // 최근 펀딩 금액
  latestFundingDate?: string; // 최근 펀딩 일자
  leadInvestor?: string; // 리드 투자자
  participatingInvestors?: string; // 참여 투자자
  cumulativeFunding?: string; // 누적 펀딩 금액
  nextRound?: string; // 다음 라운드
  targetAmount?: string; // 목표 금액
  progress?: string; // 진행 상황
  revenue2025?: string; // '25년 결산액
}

export interface ExcelSurveyData {
  surveyBatch?: string;
  productIntro?: string;
  orgStatus?: string;
  investmentStatus?: string;
  targetCustomer?: string;
  businessModel?: string;
  revenueModel?: string;
  valueProposition?: string;
  idealSuccess?: string;
  yearGoal?: string;
  biggestChallenge?: string;
  currentFocus?: string;
  desiredSupport?: string;
  dcampExpectation?: string;
  competitors?: string;
  trlStage?: string;
  ipStatus?: string;
  painPoints?: string;
  moat?: string;
}

// ── 멘토 ──────────────────────────────────────────
export interface Mentor {
  notionPageId: string;
  id: number; // auto_increment_id
  name: string; // 멘토 이름
  nameEn?: string; // 멘토 이름 (영문)
  mentorType?: string; // 멘토/코치/그로스코칭/잠재풀
  company?: string; // 소속 기업 입력
  position?: string; // 직책
  bio?: string; // 주요 이력
  linkedin?: string; // 링크드인 주소
  notionUserId?: string; // 멘토 계정 (person)
  expertiseAreas?: string[]; // 멘토링 분야 (formula)
  industries?: string[]; // 전문 산업 분야
  relatedCompanyIds?: string[]; // 관련 기업 pageIds
}

// ── 회의록 (멘토링 세션) ────────────────────────────
export interface MentoringSession {
  notionPageId: string;
  title: string; // 회의 명 (예: "3기_넥스트그라운드_1차")
  date: string; // 회의 날짜
  sessionTypes: string[]; // 회의구분: 점검/회고/전문가투입/멘토 등
  summary?: string; // 회의 내용 요약
  followUp?: string; // 후속 조치 요약
  durationHours?: number; // 미팅 진행 시간 (시간)
  companyIds: string[]; // 참석 기업 (relation pageIds)
  companyNames?: string[]; // 참석 기업 이름
  mentorIds?: string[]; // 참석 멘토 (relation pageIds)
  mentorNames?: string[]; // 참석 멘토 이름
  pmIds?: string[]; // 참석 PM (relation pageIds)
  transcript?: string; // 페이지 본문 (별도 fetch)
  collaboUrl?: string; // 콜라보 녹음 링크
  tiroUrl?: string; // 티로 녹음 링크
  source: "notion" | "slack" | "manual";
}

// ── 전문가 리소스 요청 ──────────────────────────────
export interface ExpertRequest {
  notionPageId: string;
  id: number; // auto_increment_id
  title: string; // 전문가 요청서 명 (자동 생성)
  status?: string; // 접수→검토 중→매칭 중→일정 확정→진행 완료→완료/지원불가
  urgency?: string; // 긴급/보통/여유
  supportType?: string[]; // 코칭형/투입형
  oneLiner?: string; // 한 줄 요약
  problem?: string; // 1. 해결할 문제
  priorAttempts?: string; // 2. 선행 시도 및 결과 요약
  coreQuestion?: string; // 3. 핵심 질문
  desiredExpert?: string; // 4. 희망 분야 및 전문가
  deliverableFormat?: string; // 5. 요청 산출물 형태
  successMetric?: string; // 6. 핵심 성공 지표 및 목표
  expectedImpact?: string; // 7. 예상 기여도 및 활용 계획
  dueDate?: string; // 희망 완료일
  requestedAt?: string; // 요청 일시 (created_time)
  dDay?: number; // D-day (formula)
  companyId?: string; // 요청 기업 (relation pageId)
  companyName?: string;
}

// ── 타임라인 (통합) ──────────────────────────────
export type TimelineEventSource = "notion" | "slack" | "gmail" | "manual";

export type TimelineEventType =
  | "mentoring" // 멘토링 세션 (회의구분: 멘토)
  | "checkpoint" // 점검/체크업/회고
  | "expert_request" // 전문가 리소스 요청
  | "company_update" // 기업 근황 (Slack PO Weekly 등)
  | "meeting"; // 일반 회의 / Slack 대화

export interface TimelineEvent {
  id: string;
  companyId: string;
  source: TimelineEventSource;
  type: TimelineEventType;
  date: string;
  title: string;
  rawContent: string;
  aiSummary?: string;
  linkedAnalysisId?: string;
  metadata: {
    notionPageId?: string;
    slackChannelId?: string;
    slackMessageTs?: string;
    slackMessageType?:
      | "mentoring_summary"
      | "company_update"
      | "mentor_chat";
    gmailThreadId?: string;
    participants?: string[];
  };
}

// ── AI 분석 결과 ──────────────────────────────────
export interface AnalysisSummary {
  oneLiner: string; // 한 줄 요약
  keywords: string[]; // 주요 키워드
}

export interface SurfaceIssue {
  title: string; // 표면 이슈 제목
  description: string; // 맥락 설명
}

export interface RootChallenge {
  title: string;
  description: string;
  severity: "high" | "medium" | "low";
  category: string; // Product, Team, GTM, Finance 등
  structuralCause: string; // "왜 이 문제가 반복되는가"
}

export interface RecommendedAction {
  action: string;
  owner: string; // 누가 해야 하는지
  priority: "urgent" | "high" | "medium" | "low";
  timeline: string; // e.g. "1주 내", "1개월 내"
  expectedOutcome: string;
}

export interface RiskSignal {
  title: string;
  description: string;
  pattern?: string; // 타임라인 반복 패턴
  response: string; // 누가 / 언제까지 / 무엇을
}

export interface AnalysisResult {
  id: string;
  companyId: string;
  sessionId?: string; // MentoringSession notionPageId
  createdAt: string;
  status: "pending" | "analyzing" | "completed" | "failed";
  source: TimelineEventSource;
  inputText: string; // 분석 원문
  contextSummary?: string; // 타임라인 컨텍스트 요약
  sections: {
    summary: AnalysisSummary | null;
    surfaceIssues: SurfaceIssue[] | null;
    rootChallenges: RootChallenge[] | null;
    recommendedActions: RecommendedAction[] | null;
    riskSignals: RiskSignal[] | null;
  };
  // 입력값 보존
  mentorName?: string;
  topic?: string;
  mentoringDate?: string;
  errorMessage?: string;
}

// ── KPT 회고 ──────────────────────────────────────
export interface KptReview {
  notionPageId: string;
  companyId?: string;
  reviewDate?: string;
  keep?: string; // 잘한 점
  problem?: string; // 문제점
  try?: string; // 시도할 점
}

// ── OKR 성과지표 항목 ──────────────────────────────
export interface OkrItem {
  notionPageId: string;
  name: string; // 성과지표 명
  level: string; // 구분 (오브젝티브/마일스톤/액션아이템)
  targetValue?: number; // 목표값
  achieved?: boolean; // 달성 여부
  achievementRate?: string | number; // 달성율 (formula)
  deadline?: string; // 기한
  companyId?: string;
  parentId?: string; // 상위 지표
}

// ── OKR 성과지표 측정값 ──────────────────────────────
export interface OkrValue {
  notionPageId: string;
  currentValue?: number; // 현재값
  targetValue?: string; // 목표값 (rollup)
  period?: string; // 해당 기간
  periodMonth?: string; // 기준 월
  level?: string; // 지표 구분 (rollup)
  companyId?: string;
  okrItemId?: string; // 연결 성과지표
}

// ── 배치 대시보드 OKR 달성율 (3기 등) ─────────────
export interface BatchOkrEntry {
  companyName: string;
  objective: string;
  currentValue: number | null;
  targetValue: number | null;
  notionPageId?: string; // 블록 콘텐츠 조회용 페이지 ID
  blockContent?: string; // 페이지 본문 텍스트 (상세 목표, KPI 설명)
}

// ── 배치 대시보드 전월 대비 성장률 (3기 등) ─────────────
export interface BatchGrowthEntry {
  companyName: string;
  metric: string;
  previousMonth: string | null;
  currentMonth: number | null;
  growthRate: number | null;
}

// ── 배치 대시보드 통합 데이터 ─────────────
export interface BatchDashboardData {
  batchLabel: string;
  okrEntries: BatchOkrEntry[];
  growthEntries: BatchGrowthEntry[];
}

// ── AI 컨텍스트 브리핑 (v2 — 심층 분석) ─────────────
export interface CompanyBriefing {
  id: string;
  companyId: string;
  createdAt: string;
  status: "generating" | "completed" | "failed";
  executiveSummary: {
    oneLiner: string;
    currentPhase: string;
    momentum: "positive" | "neutral" | "negative" | "critical";
    momentumReason: string;
    reportBody: string;
    pmfStage?: string;    // "pre-pmf" | "approaching" | "achieved" | "scaling"
    vocStrength?: string; // "strong" | "moderate" | "weak"
  } | null;
  okrDiagnosis: {
    overallRate: number | null;
    objectives: {
      name: string;
      achievementRate: number;
      achieved: boolean;
    }[];
    trendAnalysis: string;
    metricVsNarrative: string | null;
    kptHighlights?: {
      keep: string;
      problem: string;
      try: string;
    } | null;
  } | null;
  positiveShifts: {
    shift: string;
    evidence: string;
    detectedFrom: string;
    impactArea: string;
  }[];
  repeatPatterns: {
    issue: string;
    issueCategory: string;
    firstSeen: string;
    occurrences: number;
    structuralCause: string;
    urgency: "high" | "medium" | "low";
  }[];
  unspokenSignals: {
    signal: string;
    detectedFrom: string;
    hypothesis: string;
    earlyWarning: string;
  }[];
  mentorInsights: {
    repeatedAdvice: string;
    executedAdvice: string;
    ignoredAdvice: string;
    currentExpertRequests: string;
    gapAnalysis: string;
  } | null;
  meetingStrategy: {
    focus: string;
    avoid: string;
    keyQuestions: string[];
    openingLine: string;
  } | null;
  pmActions: {
    priority: number;
    action: string;
    deadline: string;
    why: string;
  }[];
  // ── 업계 동향 / 경쟁서비스 / 법령·정책 ──────────────
  industryContext: {
    competitors: {
      name: string;
      description: string;
      stage: string;
      similarity: string;
      implications: string; // 우리에게 주는 시사점 & 고민 사안
      recentMove: string;
      threatLevel: "high" | "medium" | "low";
    }[];
    industryTrends: {
      trend: string;
      impact: string;
      source: string;
      url?: string; // 참고 링크
    }[];
    regulatoryAndPolicy: {
      title: string;
      type: string; // "법령" | "지원사업" | "정책" | "업계소식"
      impact: string;
      actionRequired: string;
      url?: string; // 참고 링크
    }[];
    marketInsight: string;
  } | null;
  dataFingerprint: {
    lastSessionDate: string | null;
    sessionCount: number;
    expertRequestCount: number;
    analysisCount: number;
    kptCount: number;
    okrItemCount: number;
    lastEditedTime?: string; // Notion DB 최신 수정 시간 (기존 데이터 수정 감지용)
  };
  errorMessage?: string;
}

// ── API 요청/응답 타입 ──────────────────────────────
export interface AnalyzeRequest {
  companyId: string;
  transcript: string;
  mentorName?: string;
  topic?: string;
  mentoringDate?: string;
  sessionId?: string; // MentoringSession notionPageId
}

export interface AnalyzeResponse {
  success: boolean;
  analysisId?: string;
  error?: string;
}

// ══════════════════════════════════════════════════
// 기존 타입 (Notion 연동 전 / 참조용 보존)
// ══════════════════════════════════════════════════
/*
interface Company_LEGACY {
  id: string;
  name: string;
  description: string;
  industry: string;
  batch: string;
  investmentStage: string;
  teamSize: number;
  keyMetrics: Record<string, string>;
  logoEmoji: string;
}

interface MentoringRecord_LEGACY {
  id: string;
  companyId: string;
  date: string;
  mentorName: string;
  topic: string;
  transcript: string;
}

interface AnalysisSummary_LEGACY {
  oneLiner: string;
  keyTopics: string[];
  duration: string;
}

interface SurfaceIssue_LEGACY {
  statement: string;
  context: string;
}

interface RootCause_LEGACY {
  title: string;
  description: string;
  severity: "high" | "medium" | "low";
  category: string;
  evidence: string;
}

interface RiskSignal_LEGACY {
  signal: string;
  type: string;
  severity: "critical" | "warning" | "watch";
  mitigation: string;
}

interface AnalysisResult_LEGACY {
  id: string;
  companyId: string;
  mentoringRecordId?: string;
  createdAt: string;
  status: "pending" | "analyzing" | "completed" | "failed";
  summary: AnalysisSummary_LEGACY | null;
  surfaceIssues: SurfaceIssue_LEGACY[] | null;
  rootCauses: RootCause_LEGACY[] | null;
  recommendedActions: RecommendedAction[] | null;
  riskSignals: RiskSignal_LEGACY[] | null;
  inputTranscript: string;
  mentorName: string;
  topic: string;
  mentoringDate: string;
  errorMessage?: string;
}
*/
