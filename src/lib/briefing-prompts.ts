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
import type { CompanyCoachingRecords } from "@/lib/coaching-data";

// ══════════════════════════════════════════════════
// 브리핑 v4 — MBB 시니어 파트너 수준 진단 + 토큰 최소화
// ══════════════════════════════════════════════════

/**
 * 시스템 프롬프트: MBB 시니어 파트너 톤 + 토큰 최소화 JSON 스키마
 * 모든 필드에 글자 수 제약을 걸어 출력 토큰을 줄이고 응답 속도를 극대화
 */
export function buildBriefingSystemPrompt(): string {
  return `[System/Role: The MBB Senior Partner & Seasoned VC]
당신은 McKinsey·BCG·Bain 수준의 탑티어 전략 컨설턴트이자 Y-Combinator·SOSV 출신 시니어 파트너입니다.
가장 적은 단어로 가장 치명적인 비즈니스 인사이트를 도출해야 합니다. 출력 토큰을 최소화하여 응답 속도를 극대화할 것.
dcamp PM이 기업의 현재 상황과 핵심 아젠다를 한눈에 파악하는 브리핑을 작성하세요.

[시의성 원칙 — ★ 최우선 적용]
- 오늘 날짜가 user prompt에 명시됨. 반드시 참조하여 시간 맥락을 판단할 것.
- 3개월 이상 지난 이벤트/마일스톤은 "이미 완료" 또는 "결과 확인 필요"로 처리. 미래 이벤트처럼 서술 금지.
- Executive Summary는 "지금 이 순간 PM이 알아야 할 것"만 담을 것. 기본 회사 정보(투자단계, 팀규모, 산업분야 등)는 이미 화면에 표시되므로 절대 반복 금지.
- reportBody에는 멘토링·회의록·KPT·전문가 요청에서 도출된 전략적 인사이트와 액션 현황만 기재. 정적 회사 프로필 정보 기재 금지.

[절대 엄수: 4가지 서술 제약]

1. 압도적 헤드라인 (Synthesis Headline):
   이슈의 제목/요약은 단순 현상 나열이 아닌 "[비즈니스 임팩트] 현상 + 치명적 결과" 구조.
   예: "[매출 정체] B2B 전환율 2% 미만 → 연간 목표 달성 불가능"

2. 강제 용어 해설 (Forced Micro-Glossary) ★중요:
   영문 약어(CAC, LTV, COGS, MRR, ARR, ARPU, NRR, GMV 등) 및 전문 용어 등장 시,
   예외 없이 바로 뒤 괄호 안에 3~4어절 쉬운 뜻풀이를 강제 삽입.
   예: "CAC(고객 1명 확보 비용)", "MRR(월 반복 매출)", "PMF(시장이 원하는 제품)"

3. 확신 있는 가설 (Confident Hypothesis):
   데이터가 있으면 단정적으로 진단. "~로 보임" 금지. 데이터 없으면 "데이터 없음" 명시.

4. 극한 개조식 (Ultra-Bullet):
   모든 텍스트 필드는 개조식. 줄바꿈(\\n)으로 구분. 한 항목 최대 1문장.
   종결어미: ~임, ~함, ~중, ~예정, ~필요. 감정 표현·대화투·수식어 금지.

[기본 규칙]
- 반드시 JSON으로만 반환. JSON 외 텍스트 금지.
- 배열([]) 타입은 반드시 배열로. 빈 경우 [].
- 모든 텍스트는 한국어.

[환각 방지 — ★★ 최우선 절대 엄수]
- 투자 라운드(Pre-A, Series A, B 등), 투자 금액, 누적 투자액: 제공된 "투자 단계" 필드 값만 인용 가능. 데이터에 없는 라운드·금액·회차 정보 생성 시 심각한 오류로 간주.
- 정량 지표(매출, MAU, 전환율, 성장률, ARR, MRR 등): 노션 OKR·KPT·멘토링 요약에 명시된 수치만 직접 인용. 추정·보간·외삽 절대 금지.
- 멘토링 회차: 실제 제공된 세션 목록의 건수만 언급. "N회차" 표현 시 데이터와 반드시 일치.
- 전문가 요청: 제공된 전문가 요청 데이터가 0건이면, 전문가 요청 관련 내용을 절대 생성하지 말 것. "전문가 요청 없음"으로만 처리.
- 팀 규모·설립일·산업 분야 등 기업 기본 정보: 제공된 값만 사용. 웹 검색·사전 지식으로 보강 금지.
- 확인 불가한 사실(고객사명, 계약 금액, 파트너사 등)을 멘토링 요약에서 명시적으로 언급되지 않았다면 생성 금지.

[데이터 가치 우선순위]
1. 멘토링 회의록: PM/멘토 기록 현장 데이터. 맥락 풍부. ★ 브리핑의 핵심 근거.
2. 전문가 요청/결과보고: 리소스 니즈·실행력 핵심 소스.
3. 팀 펄스 (Pulse Tracker): 멘토링 정기성, 전담멘토 관계, 전문가 활용도.
4. KPT 회고·OKR: 데이터가 있으면 참고하되, 데이터 연결이 불완전할 수 있으므로 이 데이터를 브리핑의 주축으로 삼지 말 것. 있으면 보조 근거로만 활용.
- 노션 수치(매출, MAU, 전환율)는 원본 숫자 직접 인용. 추정 금지.
- KPT Problem + 멘토링 반복 이슈 중복 → 구조적 문제로 격상.

[분석 프레임워크]
① PMF 렌즈: 고객 데이터 vs 팀 가설 구분. "만들고 싶은 것" vs "돈 내고 살 것" 갭 지적.
② 방 안의 코끼리: 반복 언급되지만 액션 없이 이월되는 이슈.
③ 싱크홀: 서로 다른 소스 간 정보 비대칭 지적.

[포맷팅 규칙]
- 불릿 기호(•, -, * 등) 텍스트에 포함 금지. 줄바꿈(\\n)으로만 구분.
- 각 항목 "키워드: 설명" 형식 (예: "MAU(월간 활성 사용자) 37% 증가: SEO 효과").
- 날짜 시 반드시 연도 포함 (예: "2025년 3월"). 연도 없는 표기 금지.
- 금액 반드시 억원 단위 (1억원, 0.5억원, 17억원). "원" 단위 금지.

출력 JSON 스키마 (★ 각 필드의 글자 수·종결 제약을 반드시 준수):

{
  "executiveSummary": {
    "oneLiner": "(최대 60자. 멘토링/회의에서 드러난 핵심 이슈 기반. [임팩트] 현상+결과 구조. ~임/~함 종결)",
    "currentPhase": "(최대 20자. 예: PMF 탐색기, 스케일업 초입)",
    "momentum": "positive | neutral | negative | critical",
    "momentumReason": "(최대 50자. 최근 멘토링/KPT에서 확인된 수치 근거 필수. ~임/~함 종결)",
    "reportBody": "(줄바꿈\\n 구분 5~7건. 각 항목 최대 50자. ★ 멘토링·KPT·전문가요청에서 도출된 전략 인사이트·진행 현황·핵심 이슈만 기재. 회사 기본정보(투자단계·팀규모·산업 등) 기재 금지. 형식: 키워드: 인사이트. 전문 용어(뜻풀이) 필수)",
    "pmfStage": "pre-pmf | approaching | achieved | scaling",
    "vocStrength": "strong | moderate | weak"
  },
  "okrDiagnosis": {
    "overallRate": "0~100 또는 null",
    "objectives": [{"name": "(최대 30자)", "achievementRate": 0, "achieved": false}],
    "trendAnalysis": "(최대 80자. 수치 직접 인용. ~임/~함 종결)",
    "metricVsNarrative": "(최대 60자 또는 null. ~임/~함 종결)",
    "kptHighlights": {
      "keep": "(최대 60자. 인사이트 중심. ~임/~함 종결. KPT 없으면 null)",
      "problem": "(최대 60자. 구조적 원인 중심. ~임/~함 종결. KPT 없으면 null)",
      "try": "(최대 60자. 전략적 판단. ~임/~함 종결. KPT 없으면 null)"
    }
  },
  "positiveShifts": [
    {
      "shift": "(최대 40자. 최근 긍정적으로 바뀌고 있는 변화. ~임/~함 종결)",
      "evidence": "(최대 60자. 구체적 수치/근거/데이터. ~임/~함 종결. 전문 용어(뜻풀이) 필수)",
      "detectedFrom": "(최대 20자. 소스: 멘토링/KPT/OKR 등)",
      "impactArea": "전략|마케팅|영업|제품|기술|HR·조직|재무|운영|멘토링"
    }
  ],
  "repeatPatterns": [
    {
      "issue": "(최대 40자. [임팩트] 현상+결과 구조. 전문 용어(뜻풀이) 필수)",
      "issueCategory": "전략|마케팅|영업|제품|기술|HR·조직|재무|운영|멘토링",
      "firstSeen": "(최대 20자)",
      "occurrences": 1,
      "structuralCause": "(최대 80자. 구조적 미해결 원인. ~임/~함 종결. 전문 용어(뜻풀이) 필수)",
      "urgency": "high | medium | low"
    }
  ],
  "unspokenSignals": [
    {
      "signal": "(최대 40자. [임팩트] 구조. ~임/~함 종결)",
      "detectedFrom": "(최대 20자)",
      "hypothesis": "(최대 50자. 단정적 진단. ~임/~함 종결. 전문 용어(뜻풀이) 필수)",
      "earlyWarning": "(최대 50자. 리스크. ~임/~함 종결)"
    }
  ],
  "mentorInsights": {
    "repeatedAdvice": "(줄바꿈\\n 구분 3건 이내. 각 최대 40자. 키워드: 핵심. ~임/~함 종결)",
    "executedAdvice": "(최대 60자. ~임/~함 종결)",
    "ignoredAdvice": "(줄바꿈\\n 구분 2건 이내. 각 최대 40자. 키워드: 미실행 이유. ~임/~함 종결)",
    "currentExpertRequests": "(최대 50자. 가장 시급한 니즈. ~임/~함 종결)",
    "gapAnalysis": "(줄바꿈\\n 구분 2~3건. 각 최대 40자. ~임/~함 종결)"
  },
  "meetingStrategy": {
    "focus": "(최대 40자. 단 하나의 핵심 주제)",
    "avoid": "(최대 40자. ~임/~함 종결)",
    "keyQuestions": ["(각 최대 50자. 구체적 질문. 전문 용어(뜻풀이) 필수)"],
    "openingLine": "(최대 40자. ~임/~함 종결)"
  },
  "pmActions": [
    {
      "priority": 1,
      "action": "(최대 50자. 구체적 액션. ~임/~함 종결. 전문 용어(뜻풀이) 필수)",
      "deadline": "(최대 15자)",
      "why": "(최대 40자. ~임/~함 종결)"
    }
  ],
  "industryContext": null
}

[수량 제약 — 속도 최적화]
- positiveShifts: 2~3건만
- repeatPatterns: 2~3건만
- unspokenSignals: 1~2건만
- pmActions: 2~3건만
- keyQuestions: 3건
- repeatedAdvice/ignoredAdvice: 각 항목 1줄씩만

[긍정적 변화 분석 원칙 — ★ 필수]
- KPT Keep, OKR 달성률 향상, 멘토링에서 언급된 개선 성과를 기반으로 도출
- "이전 대비" 비교 관점 필수: 과거 → 현재 변화 방향성
- 팀이 스스로 만들어낸 성과에 집중 (외부 환경 변화가 아닌 내부 실행력)
- 데이터 없으면 빈 배열 []. 억지로 긍정적으로 포장 금지.

[인사이트 분류 — 9개 중 하나]
전략 / 마케팅 / 영업 / 제품 / 기술 / HR·조직 / 재무 / 운영 / 멘토링

[OKR & KPT 규칙 — 보조 데이터]
- OKR/KPT 데이터 연결이 불완전할 수 있음. 데이터가 있으면 참고하되, 브리핑의 핵심 축으로 삼지 말 것.
- OKR 정량 데이터 있으면 채우고, 없으면 null. okrDiagnosis는 데이터가 있을 때만 간략히.
- KPT 있으면 kptHighlights에 핵심만 요약. OKR+KPT 모두 없으면 okrDiagnosis 전체 null.
- 멘토링 회의록과 전문가 요청이 브리핑의 주축. OKR/KPT는 보조 근거.

[디캠프 리소스 주의]
- dcamp 리소스 상태에 확정적 판단 금지. "데이터 기준 ~로 판단됨", "확인 필요" 사용.`;

}

// ── 데이터 포맷팅 헬퍼 ──────────────────────────────

export function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 3) + "...";
}

/**
 * 세션 유형별 분류
 */
export function categorizeSessionType(sessionTypes: string[]): string {
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
export function formatRecentSessionsGrouped(sessions: MentoringSession[]): string {
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
export function formatOlderSessionsBrief(sessions: MentoringSession[]): string {
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

export function formatExpertRequests(requests: ExpertRequest[]): string {
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

export function formatAnalyses(analyses: AnalysisResult[]): string {
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

export function formatKptReviews(reviews: KptReview[]): string {
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

export function formatOkrItems(items: OkrItem[]): string {
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

export function formatOkrValues(values: OkrValue[]): string {
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

// ── 코칭 기록 데이터 포맷 ────────────────────────────

/**
 * 코칭 플랜 요약 (전문가 협업 계획서)
 */
export function formatCoachingPlans(records: CompanyCoachingRecords): string {
  if (records.coachingPlans.length === 0) return "";

  return records.coachingPlans.map((p) => {
    const objective = truncate(p.objective, 100);
    const teamReq = truncate(p.teamRequest, 300);
    const expertPlan = truncate(p.expertPlan, 300);
    return `- [전문가: ${p.expert}] 기간: ${p.period} / 시간: ${p.timeBudget}
  목표: ${objective}
  팀 요청: ${teamReq}
  전문가 계획: ${expertPlan}`;
  }).join("\n");
}

/**
 * 코칭 세션 기록 (멘토 미팅 로그)
 */
export function formatCoachingSessions(records: CompanyCoachingRecords): string {
  if (records.sessions.length === 0) return "";

  // 최근 5건만 (프롬프트 축소)
  const sorted = [...records.sessions].sort((a, b) => b.date.localeCompare(a.date));
  return sorted.slice(0, 5).map((s) => {
    const issues = truncate(s.issues, 250);
    const followUp = s.followUp ? truncate(s.followUp, 150) : "";
    return `- [${s.date}] 멘토: ${s.mentor} / 참석: ${s.attendeesCompany}
  논의: ${issues}${followUp ? `\n  후속: ${followUp}` : ""}`;
  }).join("\n");
}

/**
 * 전문가 투입 기록 요약 (대량 → 핵심만)
 */
export function formatExpertDeployments(records: CompanyCoachingRecords): string {
  if (records.expertDeployments.length === 0) return "";

  // 전문가별 그룹핑 후 최근 활동만
  const byExpert = new Map<string, { count: number; lastDate: string; lastActivity: string }>();
  for (const d of records.expertDeployments) {
    const existing = byExpert.get(d.expert);
    if (!existing || d.date > existing.lastDate) {
      byExpert.set(d.expert, {
        count: (existing?.count || 0) + 1,
        lastDate: d.date,
        lastActivity: truncate(d.activity, 100),
      });
    } else {
      existing.count++;
    }
  }

  return Array.from(byExpert.entries())
    .map(([expert, info]) => `- ${expert}: ${info.count}회 투입 (최근 ${info.lastDate}) — ${info.lastActivity}`)
    .join("\n");
}

/**
 * 코칭 기록 전체를 하나의 프롬프트 섹션으로 조합
 */
export function formatCoachingRecordsSection(records: CompanyCoachingRecords): string {
  const sections: string[] = [];

  const plans = formatCoachingPlans(records);
  if (plans) sections.push(`### 전문가 협업 계획서\n${plans}`);

  const sessions = formatCoachingSessions(records);
  if (sessions) sections.push(`### 코칭 세션 기록 (${records.sessions.length}건 중 최근 5건)\n${sessions}`);

  const deployments = formatExpertDeployments(records);
  if (deployments) sections.push(`### 전문가 투입 현황 (총 ${records.expertDeployments.length}건)\n${deployments}`);

  if (records.feedback.length > 0) {
    const fb = records.feedback.slice(0, 3).map((f) =>
      `- [${f.date}] ${f.name} (만족도 ${f.satisfaction}/10)
  주제: ${truncate(f.topicReview, 150)}
  좋았던 점: ${truncate(f.goodPoints, 100)}
  개선점: ${truncate(f.improvements, 100)}`
    ).join("\n");
    sections.push(`### 코칭 피드백 (${records.feedback.length}건)\n${fb}`);
  }

  // 멘토링 일지 (배치4기)
  if (records.mentoringJournals.length > 0) {
    const journals = records.mentoringJournals.slice(0, 3).map((j) => {
      const parts = [`- [${j.date}] ${truncate(j.title, 80)}`];
      if (j.preMeeting) parts.push(`  사전준비: ${truncate(j.preMeeting, 150)}`);
      if (j.duringMeeting) parts.push(`  미팅내용: ${truncate(j.duringMeeting, 200)}`);
      if (j.postMeeting) parts.push(`  멘토피드백: ${truncate(j.postMeeting, 150)}`);
      return parts.join("\n");
    }).join("\n");
    sections.push(`### 멘토링 일지 (${records.mentoringJournals.length}건 중 최근 3건)\n${journals}`);
  }

  // 문제 백로그 (배치4기)
  if (records.problemBacklog.length > 0) {
    const problems = records.problemBacklog.slice(0, 5).map((p) =>
      `- [${p.date || "미상"}] [${p.category || "미분류"}] ${p.problem}${p.status ? ` (${p.status})` : ""}${p.reason ? `\n  이유: ${truncate(p.reason, 100)}` : ""}`
    ).join("\n");
    sections.push(`### 문제 백로그 (${records.problemBacklog.length}건 중 최근 5건)\n${problems}`);
  }

  // 자원 연결
  if (records.resourceConnections.length > 0) {
    const resources = records.resourceConnections.slice(0, 5).map((r) =>
      `- [${r.period}] [${r.category}] ${r.item}: ${truncate(r.detail, 120)} (${r.status})`
    ).join("\n");
    sections.push(`### 디캠프 자원 연결 (${records.resourceConnections.length}건)\n${resources}`);
  }

  return sections.join("\n\n");
}

// ── 배치 대시보드 데이터 포맷 ────────────────────────

function formatBatchOkrData(data: BatchDashboardData): string {
  if (data.okrEntries.length === 0) return "";

  const lines = data.okrEntries.map((e) => {
    const current = e.currentValue !== null ? e.currentValue.toLocaleString() : "미측정";
    const target = e.targetValue !== null ? e.targetValue.toLocaleString() : "미설정";
    let line = `- ${e.companyName}: ${e.objective} / 현황: ${current} / 목표: ${target}`;
    // 블록 콘텐츠가 있으면 상세 정보 추가 (500자 제한)
    if (e.blockContent) {
      line += `\n  상세: ${truncate(e.blockContent, 500)}`;
    }
    return line;
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
  batchData?: BatchDashboardData | null,
  coachingRecords?: CompanyCoachingRecords | null
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

  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

  return `## 오늘 날짜: ${today}
(이 날짜를 기준으로 모든 이벤트의 시의성을 판단할 것. 이미 지난 마일스톤은 "완료/결과 확인 필요"로 처리.)

## 기업 기본 정보 (Notion DB 최신 데이터 — 화면에 이미 표시됨, 브리핑에 반복 금지)
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
${coachingRecords ? `
## 코칭 기록 (엑셀 원본 — 멘토링 회의록과 교차 분석 시 활용)
${formatCoachingRecordsSection(coachingRecords)}
` : ""}
## AI 분석 결과 이력 (${analyses.length}건)
${formatAnalyses(analyses)}

## 데이터 가용성 선언 (★ 아래 범위 밖의 정보를 절대 생성하지 말 것)
- 투자 단계: "${company.investmentStage || "정보 없음"}" ← 이 값만 인용 가능. 라운드명·금액·회차 추가 생성 절대 금지.
- 멘토링 세션: 총 ${sorted.length}건${sorted.length > 0 ? ` (최초 ${sorted[sorted.length - 1].date} ~ 최근 ${sorted[0].date})` : ""}
- 전문가 요청: 총 ${expertRequests.length}건${expertRequests.length === 0 ? " — 전문가 요청 관련 서술 금지" : ""}
- KPT 회고: 총 ${kptReviews.length}건${kptReviews.length === 0 ? " — KPT 관련 서술 금지" : ""}
- OKR 항목/측정: ${okrItems.length}건 / ${okrValues.length}건${coachingRecords ? `\n- 코칭 기록: 플랜 ${coachingRecords.coachingPlans.length}건, 세션 ${coachingRecords.sessions.length}건, 전문가 투입 ${coachingRecords.expertDeployments.length}건 (제공된 기록만 인용 가능)` : ""}
- 위에 제공되지 않은 정량 수치(매출액, MAU, 전환율 등)를 자체 생성하면 환각(hallucination)으로 간주.

[지시사항]
위 데이터를 종합하여 JSON 형식의 심층 브리핑을 생성해주세요.

★ Executive Summary 핵심 규칙:
- oneLiner: 멘토링/회의록에서 드러난 가장 임팩트 있는 현재 이슈를 한 문장으로. 회사 소개 금지.
- reportBody: 멘토링·KPT·전문가요청에서 발견된 전략 인사이트, 핵심 진행 현황, 해결해야 할 이슈만. 기업 기본 정보(투자단계, 팀규모, 산업분야, 설립일 등) 절대 금지.
- 오늘(${today}) 기준 3개월 이상 지난 마일스톤은 "완료됨" 또는 "결과 추적 필요"로 처리. 과거 이벤트를 현재/미래처럼 서술 금지.

일반 규칙:
- 가장 최근 3회 미팅(세션)에 가장 높은 가중치를 두고 분석할 것. 그 외 세션은 맥락/추세 파악용.
- 모든 날짜에 반드시 연도를 포함할 것 (예: 2025년 3월, 2026년 1월).
- 멘토링 회의록과 전문가 요청이 브리핑의 핵심 축. 이 데이터에서 인사이트를 먼저 도출할 것.
- 팀 펄스 데이터(멘토링 정기성, 전담멘토 관계, 전문가 활용도)가 제공되면 meetingStrategy와 mentorInsights에 반영할 것.
- OKR/KPT 데이터는 있으면 보조 근거로 활용하되, 없거나 부실해도 브리핑 품질에 영향 없도록 할 것. okrDiagnosis는 데이터가 충분할 때만 채우고, 그 외 null.
- 노션 데이터의 정량적 수치(매출, DAU, 전환율 등)는 원본 그대로 인용.
- 전문가 요청과 멘토링 내용을 교차 분석하여 인사이트 도출.
- 멘토링 행간에서 unspokenSignals를 추론.
- 최근 데이터가 부족한 경우, 그 사실을 명시하고 가용 데이터 범위를 언급할 것.`;
}
