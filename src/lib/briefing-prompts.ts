import type {
  Company,
  MentoringSession,
  ExpertRequest,
  AnalysisResult,
  KptReview,
  OkrItem,
  OkrValue,
  BatchDashboardData,
} from "@/types";

// ══════════════════════════════════════════════════
// 브리핑 v3 — 심층 분석 프롬프트 (최근 데이터 중심)
// ══════════════════════════════════════════════════

/**
 * 시스템 프롬프트: 심사역 수준의 진단 + JSON 출력 스키마
 */
export function buildBriefingSystemPrompt(): string {
  return `당신은 McKinsey·Accenture 수준의 전략 컨설턴트이자, Y-Combinator·SOSV 출신의 시니어 파트너입니다.
수백 개의 스타트업을 직접 멘토링하고 투자한 경험이 있으며, 글로벌 탑티어 기업의 VIP 클라이언트에게 제공하는 수준의 브리핑을 작성합니다.
dcamp PM이 멘토 미팅 직전 5분 안에 읽을 브리핑을 작성하세요.

[핵심 원칙]
- 직설적으로. 빈말·수식어·모호한 표현 금지. 팩트와 수치로만 말할 것.
- 비즈니스 프렌들리하게. 모든 이해관계자가 이해할 수 있는 언어로. 기술 용어는 비즈니스 임팩트가 있을 때만 사용.
- 단순 요약 금지. "왜?"를 파고들어 구조적 원인을 진단.
- 기업이 말한 것 vs 실제로 한 것이 다르면 반드시 지적.
- 전문가 요청 이력과 멘토링 내용을 교차 분석할 것.
- 반드시 JSON으로만 반환. JSON 외 텍스트 포함 금지.
- 모든 텍스트는 한국어.

[데이터 가치 우선순위 — 높은 순]
1. KPT 회고·N기 대시보드 데이터: 팀이 직접 작성한 1차 데이터. 가장 높은 신뢰도. 팀의 자기 인식과 실제 고민이 담겨있음.
2. 멘토링 세션 회의록: PM/멘토가 기록한 현장 데이터. 맥락과 뉘앙스가 풍부.
3. 전문가 요청/결과보고: 리소스 니즈와 실행력을 파악하는 핵심 소스.
4. OKR·KPI 성과지표: 정량적 진척도. KPT와 교차 검증하여 "말 vs 실제" 갭을 찾을 것.
- 노션에 기록된 수치 데이터(매출, MAU, 전환율, 달성율 등)는 반드시 원본 숫자를 직접 인용할 것. 추정하지 말 것.
- KPT의 Problem과 멘토링 회의록의 반복 이슈가 겹치면 → 구조적 문제로 격상하여 repeatPatterns에 반영.

[분석 프레임워크 — 모든 섹션에 이 관점을 적용]

① PMF 검증 렌즈:
- 논의된 기능/전략의 근거가 '고객 데이터/피드백'인지, '팀 내부 가설(뇌피셜)'인지 구분할 것.
- VOC(고객의 목소리) 기반 의사결정 vs 공급자 중심 사고를 판별.
- "이 기업이 만들고 싶은 것"과 "고객이 돈을 내고 살 것"의 갭이 있으면 지적.

② 방 안의 코끼리(Elephant in the Room) 탐지:
- 여러 미팅에 걸쳐 반복 언급되지만 명확한 담당자/액션 없이 이월(carry-over)되는 이슈를 찾을 것.
- 팀이 묘하게 언급을 피하거나 눈치 보느라 말하지 못하는 '불편한 진실'을 짚을 것.
- "현재 목표를 10배로 키워야 한다면, 지금 절대 하면 안 되는 것은?" 관점에서 역발상 적용.

③ 싱크홀(Sync-hole) 탐지:
- 멘토링/전문가 요청/KPT 등 서로 다른 소스 간의 정보 비대칭을 찾을 것.
- A 소스에서는 중요하게 다뤘지만 B 소스에서는 전혀 언급되지 않는 크리티컬한 정보를 지적.
- 이 비대칭이 방치되면 어떤 리소스 낭비나 장애로 번질지 시나리오를 제시.

[포맷팅 규칙 — 반드시 준수]
- 불릿 기호(•, ▪, -, *, ▸ 등)를 텍스트에 포함하지 말 것.
- 개조식 항목은 줄바꿈(\\n)으로만 구분.
- 각 항목은 "키워드: 설명" 형식으로 간결하게 (예: "MAU 37% 증가: 콘텐츠 마케팅 SEO 효과").
- 한 항목이 2문장을 넘지 않도록.
- 날짜 언급 시 반드시 연도(YYYY년)를 포함할 것 (예: "2025년 3월", "2026년 1월"). "3월" 같은 연도 없는 표기 금지.

[간결성 규칙 — 속도와 집중력을 위해 반드시 준수]
- repeatPatterns: 가장 임팩트 큰 2~3건만
- unspokenSignals: 1~2건만
- pmActions: 2~3건만
- repeatedAdvice: 핵심 3건 이내, 각 항목 1줄
- ignoredAdvice: 핵심 2건 이내, 각 항목 1줄 (키워드: 미실행 이유)
- structuralCause: 2~3문장으로 압축
- meetingStrategy의 avoid/openingLine: 각 1문장
- competitors: 2~3개만 (확실한 것만)
- industryTrends: 1~2건만
- regulatoryAndPolicy: 임팩트 큰 것 1~2건만

출력 JSON 스키마:

{
  "executiveSummary": {
    "oneLiner": "현재 핵심 상황을 한 문장으로 (직설적으로)",
    "currentPhase": "현재 단계 (예: PMF 탐색 / 채널 검증 / 스케일업 초입)",
    "momentum": "positive | neutral | negative | critical",
    "momentumReason": "모멘텀 판단 근거 1문장",
    "reportBody": "핵심 지표/수치를 줄바꿈으로 구분하여 나열. 형식: 지표명: 수치 또는 상태",
    "pmfStage": "pre-pmf | approaching | achieved | scaling",
    "vocStrength": "strong | moderate | weak (고객 데이터 기반 의사결정 강도)"
  },
  "okrDiagnosis": {
    "overallRate": "0~100 숫자. N기 대시보드의 정량 데이터 우선 반영. 없으면 null",
    "objectives": [{ "name": "핵심목표/KPI 명칭", "achievementRate": 0, "achieved": false }],
    "trendAnalysis": "N기 대시보드 수치 변화 기반 추이 분석 1~2문장. 노션에 기록된 숫자를 직접 인용할 것",
    "metricVsNarrative": "말 vs 실제가 다른 점. 없으면 null"
  },
  "repeatPatterns": [
    {
      "issue": "핵심을 한 줄로",
      "issueCategory": "전략 | 마케팅 | 영업 | 제품 | 기술 | HR·조직 | 재무 | 운영 | 멘토링",
      "firstSeen": "근거 출처",
      "occurrences": 1,
      "structuralCause": "왜 해결 안 되는가? 증상 말고 구조적 원인. 2~3문장.",
      "urgency": "high | medium | low"
    }
  ],
  "unspokenSignals": [
    {
      "signal": "행간에서 읽히는 것 (1문장)",
      "detectedFrom": "감지 출처",
      "hypothesis": "가설 1문장",
      "earlyWarning": "현실화 시 리스크 (1문장)"
    }
  ],
  "mentorInsights": {
    "repeatedAdvice": "멘토 반복 조언. 줄바꿈으로 구분. 형식: 키워드: 핵심 내용",
    "executedAdvice": "멘토 매칭 적합성 1~2문장",
    "ignoredAdvice": "미실행 조언. 줄바꿈으로 구분. 형식: 키워드: 미실행 이유 한 줄",
    "currentExpertRequests": "가장 시급한 리소스 니즈 1문장",
    "gapAnalysis": "dcamp 지원 가능 방안. 줄바꿈으로 구분. 각 1줄"
  },
  "meetingStrategy": {
    "focus": "이번 세션 단 하나의 핵심 주제",
    "avoid": "피해야 할 것 1문장",
    "keyQuestions": ["질문1", "질문2", "질문3"],
    "openingLine": "주목할 것 1문장"
  },
  "pmActions": [
    {
      "priority": 1,
      "action": "구체적 액션 1문장",
      "deadline": "언제까지",
      "why": "왜 지금 (1문장)"
    }
  ],
  "industryContext": null
}

[인사이트 분류 기준 — 9개 중 하나만 사용]
전략 / 마케팅 / 영업 / 제품 / 기술 / HR·조직 / 재무 / 운영 / 멘토링
(채용·팀빌딩 → HR·조직, GTM·브랜딩 → 마케팅, 고객 확보·매출 → 영업, 기술 부채 → 기술, 프로세스 → 운영)

[OKR] OKR 데이터 있으면 채우고, 없으면 null.

[디캠프 리소스 판단 — 주의사항]
- 전문가 투입, 실무진 지원 등 dcamp 리소스의 현재 상태에 대해 확정적 판단을 내리지 말 것.
- "종료되었다", "내재화 완료" 등 확정적 표현 금지. 기록에 없을 뿐 아직 진행 중일 수 있음.
- 대신 "데이터 기준 ~로 보임", "확인 필요" 등 유보적 표현 사용.
- gapAnalysis, currentExpertRequests는 가능성과 방향성을 제시하되, 단정하지 않도록.`;

}

// ── 데이터 포맷팅 헬퍼 ──────────────────────────────

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 3) + "...";
}

/**
 * 세션 유형별 분류
 */
function categorizeSessionType(sessionTypes: string[]): string {
  const types = sessionTypes.join(", ");
  if (types.includes("멘토")) return "멘토 세션";
  if (types.includes("전문가투입")) return "전문가 투입";
  if (types.includes("점검") || types.includes("체크업")) return "점검/체크업";
  if (types.includes("회고")) return "회고";
  return "기타";
}

/**
 * 최근 세션을 유형별로 그룹화하여 포맷
 */
function formatRecentSessionsGrouped(sessions: MentoringSession[]): string {
  if (sessions.length === 0) return "최근 3개월간 멘토링 기록 없음";

  // 유형별 그룹화
  const groups: Record<string, MentoringSession[]> = {};
  for (const s of sessions) {
    const category = categorizeSessionType(s.sessionTypes);
    if (!groups[category]) groups[category] = [];
    groups[category].push(s);
  }

  const sections: string[] = [];
  const groupOrder = ["점검/체크업", "멘토 세션", "회고", "전문가 투입", "기타"];

  for (const groupName of groupOrder) {
    const groupSessions = groups[groupName];
    if (!groupSessions || groupSessions.length === 0) continue;

    sections.push(`\n### [${groupName}]`);
    // 그룹별 최대 2건만 (프롬프트 축소 → 응답 속도 개선)
    for (const s of groupSessions.slice(0, 2)) {
      const summary = s.summary ? truncate(s.summary, 250) : "요약 없음";
      const followUp = s.followUp ? `\n  후속조치: ${truncate(s.followUp, 150)}` : "";
      const mentors = s.mentorNames?.join(", ") || "멘토 미기재";
      sections.push(`- [${s.date}] ${s.title} / 멘토: ${mentors}\n  요약: ${summary}${followUp}`);
    }
  }

  return sections.join("\n");
}

/**
 * 이전 세션 간략 요약 (타임라인 맥락용)
 */
function formatOlderSessionsBrief(sessions: MentoringSession[]): string {
  if (sessions.length === 0) return "이전 기록 없음";

  // 최대 8건만 (프롬프트 축소)
  return sessions
    .slice(0, 8)
    .map((s) => {
      const types = s.sessionTypes.join("/");
      return `- [${s.date}] [${types}] ${s.title}`;
    })
    .join("\n");
}

function formatExpertRequests(requests: ExpertRequest[]): string {
  if (requests.length === 0) return "전문가 요청 없음";

  // 최대 5건만 (프롬프트 축소)
  return requests
    .slice(0, 5)
    .map((r) => {
      const date = r.requestedAt?.split("T")[0] || "날짜 미상";
      const status = r.status || "접수";
      const urgency = r.urgency || "보통";
      const oneLiner = r.oneLiner || "요약 없음";
      const problem = r.problem ? truncate(r.problem, 120) : "";
      return `- [${date}] [${status}] [${urgency}] ${oneLiner}${problem ? ` / ${problem}` : ""}`;
    })
    .join("\n");
}

function formatAnalyses(analyses: AnalysisResult[]): string {
  if (analyses.length === 0) return "AI 분석 결과 없음";

  return analyses
    .filter((a) => a.status === "completed")
    .slice(0, 5)
    .map((a) => {
      const date = a.createdAt.split("T")[0];
      const oneLiner = a.sections.summary?.oneLiner || "요약 없음";
      return `- [${date}] ${oneLiner}`;
    })
    .join("\n");
}

function formatKptReviews(reviews: KptReview[]): string {
  if (reviews.length === 0) return "데이터 없음";

  // 최대 3건만 (프롬프트 축소)
  return reviews
    .slice(0, 3)
    .map((r) => {
      const date = r.reviewDate || "날짜 미상";
      const keep = r.keep ? truncate(r.keep, 200) : "없음";
      const problem = r.problem ? truncate(r.problem, 200) : "없음";
      const tryText = r.try ? truncate(r.try, 200) : "없음";
      return `- [${date}]\n  Keep: ${keep}\n  Problem: ${problem}\n  Try: ${tryText}`;
    })
    .join("\n");
}

function formatOkrItems(items: OkrItem[]): string {
  if (items.length === 0) return "데이터 없음";

  const order: Record<string, number> = { "오브젝티브": 0, "마일스톤": 1, "액션아이템": 2 };
  // 최대 8건만 (프롬프트 축소)
  const sorted = [...items].sort(
    (a, b) => (order[a.level] ?? 9) - (order[b.level] ?? 9)
  ).slice(0, 8);

  return sorted
    .map((item) => {
      const rate = item.achievementRate !== undefined ? `${item.achievementRate}%` : "미측정";
      const achieved = item.achieved ? "달성" : "미달성";
      const deadline = item.deadline || "기한 없음";
      const target = item.targetValue !== undefined ? `목표: ${item.targetValue}` : "";
      return `- [${item.level}] ${item.name} / ${rate} (${achieved}) ${target} / 기한: ${deadline}`;
    })
    .join("\n");
}

function formatOkrValues(values: OkrValue[]): string {
  if (values.length === 0) return "데이터 없음";

  // 최대 8건만 (프롬프트 축소)
  return values
    .slice(0, 8)
    .map((v) => {
      const period = v.periodMonth || v.period || "기간 미상";
      const current = v.currentValue !== undefined ? v.currentValue : "없음";
      const target = v.targetValue || "없음";
      const level = v.level || "";
      return `- [${period}] ${level ? `[${level}] ` : ""}현재: ${current} / 목표: ${target}`;
    })
    .join("\n");
}

// ── 배치 대시보드 데이터 포맷 ────────────────────────

function formatBatchOkrData(data: BatchDashboardData): string {
  if (data.okrEntries.length === 0) return "";

  const lines = data.okrEntries.map((e) => {
    const current = e.currentValue !== null ? e.currentValue.toLocaleString() : "미측정";
    const target = e.targetValue !== null ? e.targetValue.toLocaleString() : "미설정";
    return `- ${e.companyName}: ${e.objective} / 현황: ${current} / 목표: ${target}`;
  });
  return `### 오브젝티브 달성율\n${lines.join("\n")}`;
}

function formatBatchGrowthData(data: BatchDashboardData): string {
  if (data.growthEntries.length === 0) return "";

  const lines = data.growthEntries.map((e) => {
    const rate = e.growthRate !== null
      ? (e.growthRate >= 0 ? `+${e.growthRate}%` : `${e.growthRate}%`)
      : "미측정";
    const current = e.currentMonth !== null ? e.currentMonth.toLocaleString() : "없음";
    return `- ${e.companyName}: ${e.metric} / 당월: ${current} / 성장률: ${rate}`;
  });
  return `### 전월 대비 성장률\n${lines.join("\n")}`;
}

/**
 * 사용자 프롬프트: 최근 60일 중심 + 유형별 구분 + 간략 타임라인
 */
export function buildBriefingUserPrompt(
  company: Company,
  sessions: MentoringSession[],
  expertRequests: ExpertRequest[],
  analyses: AnalysisResult[],
  kptReviews: KptReview[],
  okrItems: OkrItem[],
  okrValues: OkrValue[],
  batchData?: BatchDashboardData | null
): string {
  const batchPeriod =
    company.batchStartDate && company.batchEndDate
      ? `${company.batchStartDate} ~ ${company.batchEndDate}`
      : "정보 없음";

  // 90일(약 3개월) 기준으로 세션 분리
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 90);
  const cutoffStr = cutoffDate.toISOString().split("T")[0];

  // 날짜 내림차순 정렬
  const sorted = [...sessions].sort((a, b) => b.date.localeCompare(a.date));
  // 최근 3개월 세션을 주요 분석 대상으로 사용
  // 3개월 내 데이터가 부족하면 최소 5건까지 보충
  const within3mo = sorted.filter((s) => s.date >= cutoffStr);
  const recentSessions = within3mo.length >= 5
    ? within3mo
    : sorted.slice(0, Math.max(within3mo.length, 5));
  const recentIds = new Set(recentSessions.map((s) => s.notionPageId));
  const olderSessions = sorted.filter((s) => !recentIds.has(s.notionPageId));

  // 기업 정보 항목 (값이 있는 것만 포함)
  const companyFields: string[] = [
    `- 기업명: ${company.name}`,
    `- 배치: ${company.batchLabel || "정보 없음"} (기간: ${batchPeriod})`,
  ];
  if (company.description) companyFields.push(`- 기업 소개: ${truncate(company.description, 300)}`);
  companyFields.push(`- 투자 단계: ${company.investmentStage || "정보 없음"}`);
  if (company.dealType?.length) companyFields.push(`- 거래 유형: ${company.dealType.join(", ")}`);
  if (company.serviceType?.length) companyFields.push(`- 서비스/제품 유형: ${company.serviceType.join(", ")}`);
  companyFields.push(`- 제품 성숙도: ${company.productMaturity || "정보 없음"} / 기술 성숙도: ${company.techMaturity || "정보 없음"}`);
  companyFields.push(`- 산업 분야: ${company.industryNames?.join(", ") || "정보 없음"}`);
  companyFields.push(`- 팀 규모: ${company.teamSize || "정보 없음"}명`);
  if (company.foundedDate) companyFields.push(`- 설립일: ${company.foundedDate}`);
  if (company.customerScaleRaw) companyFields.push(`- 고객 규모: ${company.customerScaleRaw}`);
  if (company.growthStageRaw) companyFields.push(`- 성장 단계: ${company.growthStageRaw}`);
  if (company.marketSize) companyFields.push(`- 시장 규모: ${company.marketSize}`);
  if (company.website) companyFields.push(`- 웹사이트: ${company.website}`);
  if (company.achievementRate !== undefined) companyFields.push(`- OKR 달성율: ${company.achievementRate}%`);

  // 배치 대시보드 섹션 (데이터가 있을 때만 포함)
  let batchSection = "";
  if (batchData) {
    const okrSection = formatBatchOkrData(batchData);
    const growthSection = formatBatchGrowthData(batchData);
    if (okrSection || growthSection) {
      batchSection = `\n## ${batchData.batchLabel} 배치 대시보드 현황\n${[okrSection, growthSection].filter(Boolean).join("\n\n")}\n`;
    }
  }

  return `## 기업 기본 정보 (Notion DB 최신 데이터)
${companyFields.join("\n")}
${batchSection}
## OKR 현황
### 성과지표 항목 (${okrItems.length}건)
${formatOkrItems(okrItems)}

### 성과지표 측정값 (${okrValues.length}건)
${formatOkrValues(okrValues)}

## KPT 회고 (${kptReviews.length}건)
${formatKptReviews(kptReviews)}

## 주요 멘토링 세션 (${recentSessions.length}건, 최근 3개월 우선) — 분석 핵심 근거
${formatRecentSessionsGrouped(recentSessions)}

## 이전 세션 타임라인 (${olderSessions.length}건) — 맥락 참고용
${formatOlderSessionsBrief(olderSessions)}

## 전문가 리소스 요청 (${expertRequests.length}건)
${formatExpertRequests(expertRequests)}

## AI 분석 결과 이력 (${analyses.length}건)
${formatAnalyses(analyses)}

[지시사항]
위 데이터를 종합하여 JSON 형식의 심층 브리핑을 생성해주세요.
- 가장 최근 3회 미팅(세션)에 가장 높은 가중치를 두고 분석할 것. 그 외 세션은 맥락/추세 파악용.
- 모든 날짜에 반드시 연도를 포함할 것 (예: 2025년 3월, 2026년 1월).
- OKR·KPI 데이터가 있으면 okrDiagnosis를 채우고, 없으면 null.
- 노션 데이터의 정량적 수치(매출, DAU, 전환율 등)는 원본 그대로 인용.
- 전문가 요청과 멘토링 내용을 교차 분석하여 인사이트 도출.
- KPT Problem과 멘토링 행간에서 unspokenSignals를 추론.
- 최근 데이터가 부족한 경우, 그 사실을 명시하고 가용 데이터 범위를 언급할 것.`;
}
