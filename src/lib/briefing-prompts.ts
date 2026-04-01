import type {
  Company,
  MentoringSession,
  ExpertRequest,
  AnalysisResult,
} from "@/types";
import type { CompanyCoachingRecords } from "@/lib/coaching-data";
import type { SlackMessage } from "@/lib/slack";

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
dcamp PM과 멘토가 "이 팀이 지금 어떤 상황이고, 다음 미팅에서 무엇을 다뤄야 하는지" 3분 안에 파악할 수 있는 브리핑을 작성하세요.

[당신의 역할 — ★★★ 최우선]
당신은 요약자가 아니라 진단자다. PM은 멘토링에 이미 참석했고 세션 내용을 안다.
당신의 가치는 PM이 보지 못한 패턴, 두 번째 의미(second-order implication), 구조적 원인을 밝히는 것이다.
- 세션 내용을 그대로 되풀이하면 가치 제로. "이미 아는 얘기"를 반복하지 말 것.
- 모든 인사이트에 "그래서 뭐?(So What?)"를 2단계까지 추적할 것:
  관찰 → 의미 → 사업적 결과. 관찰에서 멈추면 실패.
  나쁜 예: "시스템 장애가 반복됨" (관찰에서 멈춤)
  좋은 예: "시스템 장애 8개월 미해결 → CTO급 의사결정자 부재 시사 → 모든 기술 수정이 땜질이므로 스케일업 시 붕괴 위험"

[필수 분석 렌즈 — 반드시 3개 모두 적용하여 브리핑에 반영]
① 단위경제(Unit Economics) 렌즈: 매출·사용자·팀규모 간의 비율에서 비즈니스 모델의 건전성을 진단.
   예: "MAU 215만에 월매출 1.7억 = ARPU(사용자당 매출) 약 80원 → 광고 모델이 아니면 설명 불가. 수익화 경로가 불명확함"
② 방 안의 코끼리: 같은 조언이 N회 반복되는데 해결 안 되는 이슈가 있으면, "팀이 못 하는 건가, 안 하는 건가?" 구분하여 구조적 원인을 지적할 것.
   예: "기술 부채 조언이 4회 반복 → 리소스 부족이 아니라 기술 리더십 부재. 의사결정 구조가 근본 원인"
③ 소멸 신호: 이전 세션에서 언급되었다가 이후 사라진 주제를 추적. 사라진 것이 해결된 건지 포기한 건지 구분.
   예: "B2B 전환을 8월에 논의했으나 이후 3회 세션에서 미언급 → 포기했을 가능성. 수익 다각화 기회 상실 위험"

[시의성 원칙]
- 오늘 날짜가 user prompt에 명시됨. 반드시 참조하여 시간 맥락을 판단할 것.
- 3개월 이상 지난 이벤트/마일스톤은 "이미 완료" 또는 "결과 확인 필요"로 처리. 미래 이벤트처럼 서술 금지.
- Executive Summary는 "지금 이 순간 PM이 알아야 할 것"만 담을 것. 기본 회사 정보(투자단계, 팀규모, 산업분야 등)는 이미 화면에 표시되므로 절대 반복 금지.

[운영 에로사항 출력 금지 — ★★★ 전 섹션 적용 (okrDiagnosis, pmActions 포함)]
아래 유형의 내용은 브리핑 어디에도 포함하지 말 것. 이것은 PM의 운영 업무이지 기업 진단이 아님:
- OKR/KPI 미작성·미설정·미제출·체계 부재
- KPT 회고 미작성·미제출·미진행
- 전담멘토 미팅 미진행·미수행·일정 미확보
- 멘토링 세션 부족·미진행
- 회의록 미작성·데이터 부족·기록 미비
- 성과지표 미등록·달성율 미입력
- Slack 채널 활동 없음·비활성
- 데이터 부족으로 분석 불가
- "OKR 기본 프레임워크 구축" 같은 운영 액션을 pmActions에 넣지 말 것.
오직 사업·전략·시장·고객·제품·기술·재무 관점의 인사이트만 출력할 것.

[서술 제약]

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
   ★ reportBody는 반드시 줄바꿈(\\n)으로 구분된 5~7건의 개조식. 연속된 문단 형식 절대 금지.

[기본 규칙]
- 반드시 JSON으로만 반환. JSON 외 텍스트 금지.
- 배열([]) 타입은 반드시 배열로. 빈 경우 [].
- 모든 텍스트는 한국어.

[환각 방지 — ★★ 최우선 절대 엄수]
- 투자 라운드(Pre-A, Series A, B 등), 투자 금액, 누적 투자액: 제공된 "투자 단계" 필드 값만 인용 가능. 데이터에 없는 라운드·금액·회차 정보 생성 시 심각한 오류로 간주.
- 정량 지표(매출, MAU, 전환율, 성장률, ARR, MRR 등): 노션 Objective·KPT·멘토링 요약에 명시된 수치만 직접 인용. 추정·보간·외삽 절대 금지.
- 멘토링 회차: 실제 제공된 세션 목록의 건수만 언급. "N회차" 표현 시 데이터와 반드시 일치.
- 전문가 요청: 제공된 전문가 요청 데이터가 0건이면, 전문가 요청 관련 내용을 절대 생성하지 말 것. "전문가 요청 없음"으로만 처리.
- 팀 규모·설립일·산업 분야 등 기업 기본 정보: 제공된 값만 사용. 웹 검색·사전 지식으로 보강 금지.
- 확인 불가한 사실(고객사명, 계약 금액, 파트너사 등)을 멘토링 요약에서 명시적으로 언급되지 않았다면 생성 금지.

[데이터 가치 우선순위]
1. 멘토링 회의록: PM/멘토 기록 현장 데이터. 맥락 풍부. ★ 브리핑의 핵심 근거.
2. 전문가 요청/결과보고: 리소스 니즈·실행력 핵심 소스.
3. 팀 펄스 (Pulse Tracker): 멘토링 정기성, 전담멘토 관계, 전문가 활용도.
4. Slack 채널 대화: 실시간 맥락 보완. 다른 소스와 교차 검증 용도.
- 노션 수치(매출, MAU, 전환율)는 원본 숫자 직접 인용. 추정 금지.

[데이터 가치 해석 원칙]
- 숫자를 그대로 인용하는 것은 인사이트가 아님. 숫자 간의 관계·비율·추세에서 의미를 도출할 것.
  예: "MAU 200만 → 월매출 1.7억 → ARPU(사용자당 매출) 85원. 트래픽 대비 수익화 극히 저조"
- 같은 주제가 여러 세션에 걸쳐 등장하면, "왜 해결 안 되는가"를 반드시 진단.
- 한 세션에서 언급되고 이후 사라진 주제는 "해결됨 vs 포기됨" 중 판단하여 서술.

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
    "reportBody": "(★ 반드시 줄바꿈\\n으로 구분된 5~7건 개조식. 연속 문단 금지. 각 항목 최대 60자. 멘토링 내용을 요약하지 말고, 데이터에서 도출한 전략적 진단·의미·위험을 기재. 'So What?'까지 포함. 회사 기본정보 기재 금지. 형식: 키워드: 진단+의미. 전문 용어(뜻풀이) 필수)",
    "pmfStage": "pre-pmf | approaching | achieved | scaling",
    "vocStrength": "strong | moderate | weak"
  },
  "positiveShifts": [
    {
      "shift": "(최대 40자. 최근 긍정적으로 바뀌고 있는 변화. ~임/~함 종결)",
      "evidence": "(최대 60자. 구체적 수치/근거/데이터. ~임/~함 종결. 전문 용어(뜻풀이) 필수)",
      "detectedFrom": "(최대 20자. 소스: 멘토링/KPT/Objective 등)",
      "impactArea": "전략|마케팅|영업|제품|기술|HR·조직|재무|운영|멘토링"
    }
  ],
  "repeatPatterns": [
    {
      "issue": "(최대 40자. [임팩트] 현상+결과 구조. 전문 용어(뜻풀이) 필수)",
      "issueCategory": "전략|마케팅|영업|제품|기술|HR·조직|재무|운영|멘토링",
      "firstSeen": "(최대 20자)",
      "occurrences": 1,
      "structuralCause": "(최대 100자. ★ 핵심: 단순 현상이 아닌 '왜 이것이 해결되지 않는가'를 진단. 팀 역량·의사결정 구조·우선순위 관점에서 근본 원인을 밝힐 것. 전문 용어(뜻풀이) 필수)",
      "urgency": "high | medium | low"
    }
  ],
  "unspokenSignals": [
    {
      "signal": "(최대 50자. 사업·전략·시장 관점의 숨겨진 신호. [임팩트] 구조. ~임/~함 종결)",
      "detectedFrom": "(최대 20자)",
      "hypothesis": "(최대 80자. 데이터 행간을 읽은 단정적 진단. 왜 이것이 문제인지 근거 포함. ~임/~함 종결. 전문 용어(뜻풀이) 필수)",
      "earlyWarning": "(최대 60자. 이 신호를 방치하면 발생할 구체적 리스크. ~임/~함 종결)"
    }
  ],
  "mentorInsights": {
    "repeatedAdvice": "(줄바꿈\\n 구분 3건 이내. 각 최대 40자. 키워드: 핵심. ~임/~함 종결)",
    "executedAdvice": "(최대 60자. ~임/~함 종결)",
    "ignoredAdvice": "(줄바꿈\\n 구분 2건 이내. 각 최대 40자. 키워드: 미실행 이유. ~임/~함 종결)"
  },
  "meetingStrategy": {
    "focus": "(최대 50자. ★ 이 미팅에서 단 하나의 진실만 확인할 수 있다면 무엇이어야 하는가?)",
    "avoid": "(최대 50자. ~임/~함 종결)",
    "keyQuestions": ["(각 최대 60자. ★ 팀이 불편해할 수 있지만 반드시 물어야 하는 질문. 구체적 숫자/사실 기반. 전문 용어(뜻풀이) 필수)"],
    "openingLine": "(최대 50자. 최근 데이터 기반의 구체적 사실로 시작. ~임/~함 종결)"
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

[수량 제약 — 최소~최대 범위 엄수]
- reportBody: 4~7건 (★ 최소 4건 필수. 데이터 부족 시에도 가용 소스에서 도출)
- positiveShifts: 2~3건만
- repeatPatterns: 2~3건 (★ 최소 2건 필수. 세션이 1건이라도 그 안에서 반복 이슈 추출)
- unspokenSignals: 2~4건 (★ 최소 2건 필수. 가장 분석적인 섹션 — 깊이 있게)
- pmActions: 2~3건만
- keyQuestions: 3건
- repeatedAdvice/ignoredAdvice: 각 항목 1줄씩만

[긍정적 변화 분석 원칙 — ★ 필수. 멘토가 "이 팀이 뭘 잘하고 있는지" 파악하는 섹션]
- 멘토링에서 언급된 개선 성과를 기반으로 도출
- "이전 대비" 비교 관점 필수: 과거 → 현재 변화 방향성 (구체적 수치/사실)
- 팀이 스스로 만들어낸 성과에 집중 (외부 환경 변화가 아닌 내부 실행력)
- ★ 최소 2건은 반드시 작성할 것. 어떤 팀이든 잘하고 있는 것이 있음. 찾아서 인정할 것.
- 단, 억지로 긍정적으로 포장하지는 말 것. 진짜 긍정적 변화만.

[인사이트 분류 — 9개 중 하나]
전략 / 마케팅 / 영업 / 제품 / 기술 / HR·조직 / 재무 / 운영 / 멘토링

[말하지 않은 신호(unspokenSignals) — ★★★ 브리핑의 핵심 가치. PM이 "이건 몰랐는데"라고 할 인사이트]
- 멘토링 노트에 이미 적혀있는 내용을 다시 쓰면 가치 제로. 다음 유형만 작성:
  a) 소멸 신호: 이전에 논의되었다가 후속 세션에서 사라진 주제 → 해결됨/포기됨 판단
  b) 숫자 간 괴리: 매출 vs 사용자 수, 목표 vs 실적, 팀규모 vs 사업 범위 간의 불균형
  c) 행동 패턴: 팀이 말하는 것(우선순위)과 실제 하는 것(시간 배분) 간의 불일치
  d) 의존 구조: 특정 고객/파트너/인력에 대한 과도한 의존이 숨겨진 리스크 형성
- 운영·관리적 부재(OKR 미설정, KPT 미작성, 데이터 부족 등)는 절대 포함 금지.
- hypothesis에는 "왜 이것이 사업적으로 위험한지" 인과관계를 2단계까지 추적할 것.
  관찰 → 의미 → 사업적 결과 순서로 서술.
- 복수 소스를 교차 분석하여 단일 소스에서 보이지 않는 패턴을 발견할 것.

[전담멘토 vs 전문가 리소스 구분 — ★ 필수]
- "전담멘토"는 별도의 리소스 요청 없이 멘토 미팅·점검 미팅 형태로 운영됨.
- 전담멘토 관련 활동(전담멘토 미팅, 점검미팅, 멘토미팅)은 "멘토링 세션"으로만 분류할 것.
- "전문가 리소스 요청"은 전담멘토가 아닌 외부 전문가 투입·코칭 요청만 해당.
- mentorInsights.currentExpertRequests에 전담멘토를 포함하지 말 것.
- 전담멘토 이름이 company info에 명시되어 있으면, 해당 인물의 활동을 리소스 요청이 아닌 멘토링 활동으로 처리할 것.

[Slack 컨텍스트 활용]
- Slack 채널 메시지가 제공되면, 기존 섹션(executiveSummary, repeatPatterns, unspokenSignals, pmActions 등)에 자연스럽게 녹여 분석할 것.
- Slack 데이터를 별도 섹션으로 분리하지 말 것. 멘토링·KPT 등 다른 소스와 교차 검증하여 인사이트를 강화하는 용도로 사용.
- Slack에서만 발견되는 새로운 이슈가 있다면 해당 섹션(repeatPatterns, unspokenSignals 등)에 포함.

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
      const summary = s.summary ? truncate(s.summary, 200) : "요약 없음";
      const followUp = s.followUp ? `\n  후속조치: ${truncate(s.followUp, 150)}` : "";
      const mentors = s.mentorNames?.join(", ") || "멘토 미기재";
      // transcript(페이지 본문)가 있으면 300자까지 포함 — 핵심 맥락 보강
      const transcript = s.transcript ? `\n  회의 전문(발췌): ${truncate(s.transcript, 300)}` : "";
      sections.push(`- [${s.date}] ${s.title} / 멘토: ${mentors}\n  요약: ${summary}${followUp}${transcript}`);
    }
  }

  return sections.join("\n");
}

/**
 * 이전 세션 간략 요약 (타임라인 맥락용)
 */
export function formatOlderSessionsBrief(sessions: MentoringSession[]): string {
  if (sessions.length === 0) return "이전 기록 없음";

  // 최대 5건만 (프롬프트 축소)
  return sessions
    .slice(0, 5)
    .map((s) => {
      const types = s.sessionTypes.join("/");
      return `- [${s.date}] [${types}] ${s.title}`;
    })
    .join("\n");
}

// 전담멘토 관련 키워드 — 전문가 리소스 요청에서 제외
const DEDICATED_MENTOR_KEYWORDS = ["전담멘토", "전담 멘토", "점검미팅", "점검 미팅", "멘토미팅", "멘토 미팅"];

function isDedicatedMentorRequest(request: ExpertRequest): boolean {
  const searchText = [request.title, request.oneLiner, request.problem].filter(Boolean).join(" ");
  return DEDICATED_MENTOR_KEYWORDS.some((kw) => searchText.includes(kw));
}

export function formatExpertRequests(requests: ExpertRequest[]): string {
  // 전담멘토 관련 요청은 제외 (멘토링 세션으로 분류)
  const filtered = requests.filter((r) => !isDedicatedMentorRequest(r));
  if (filtered.length === 0) return "전문가 요청 없음";

  // 최대 5건만 (프롬프트 축소)
  return filtered
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

// ── 코칭 기록 데이터 포맷 ────────────────────────────

/**
 * 코칭 플랜 요약 (전문가 협업 계획서) — 핵심만 축약
 */
export function formatCoachingPlans(records: CompanyCoachingRecords): string {
  if (records.coachingPlans.length === 0) return "";

  return records.coachingPlans.map((p) => {
    return `- [전문가: ${p.expert}] 기간: ${p.period} / 시간: ${p.timeBudget} / 목표: ${truncate(p.objective, 80)}`;
  }).join("\n");
}

/**
 * 코칭 세션 기록 (멘토 미팅 로그) — 최근 3건만
 */
export function formatCoachingSessions(records: CompanyCoachingRecords): string {
  if (records.sessions.length === 0) return "";

  const sorted = [...records.sessions].sort((a, b) => b.date.localeCompare(a.date));
  return sorted.slice(0, 3).map((s) => {
    return `- [${s.date}] 멘토: ${s.mentor} / 논의: ${truncate(s.issues, 150)}`;
  }).join("\n");
}

/**
 * 전문가 투입 기록 요약 (전문가별 1줄 요약)
 */
export function formatExpertDeployments(records: CompanyCoachingRecords): string {
  if (records.expertDeployments.length === 0) return "";

  // 전문가별 그룹핑
  const byExpert = new Map<string, { count: number; firstDate: string; lastDate: string }>();
  for (const d of records.expertDeployments) {
    const existing = byExpert.get(d.expert);
    if (!existing) {
      byExpert.set(d.expert, { count: 1, firstDate: d.date, lastDate: d.date });
    } else {
      existing.count++;
      if (d.date < existing.firstDate) existing.firstDate = d.date;
      if (d.date > existing.lastDate) existing.lastDate = d.date;
    }
  }

  return Array.from(byExpert.entries())
    .map(([expert, info]) => `- ${expert}: ${info.count}회 (${info.firstDate} ~ ${info.lastDate})`)
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
  if (sessions) sections.push(`### 코칭 세션 기록 (${records.sessions.length}건 중 최근 3건)\n${sessions}`);

  const deployments = formatExpertDeployments(records);
  if (deployments) sections.push(`### 전문가 투입 현황 (총 ${records.expertDeployments.length}건)\n${deployments}`);

  if (records.feedback.length > 0) {
    const fb = records.feedback.slice(0, 3).map((f) =>
      `- [${f.date}] ${f.name} 만족도 ${f.satisfaction}/10 / ${truncate(f.topicReview, 80)}`
    ).join("\n");
    sections.push(`### 코칭 피드백 (${records.feedback.length}건)\n${fb}`);
  }

  // 멘토링 일지 (배치4기) — 1줄 요약
  if (records.mentoringJournals.length > 0) {
    const journals = records.mentoringJournals.slice(0, 3).map((j) =>
      `- [${j.date}] ${truncate(j.title, 60)}${j.postMeeting ? ` → ${truncate(j.postMeeting, 80)}` : ""}`
    ).join("\n");
    sections.push(`### 멘토링 일지 (${records.mentoringJournals.length}건 중 최근 3건)\n${journals}`);
  }

  // 문제 백로그 (배치4기) — 핵심만
  if (records.problemBacklog.length > 0) {
    const problems = records.problemBacklog.slice(0, 5).map((p) =>
      `- [${p.category || "미분류"}] ${truncate(p.problem, 80)}${p.status ? ` (${p.status})` : ""}`
    ).join("\n");
    sections.push(`### 문제 백로그 (${records.problemBacklog.length}건)\n${problems}`);
  }

  // 자원 연결 — 1줄 요약
  if (records.resourceConnections.length > 0) {
    const resources = records.resourceConnections.slice(0, 5).map((r) =>
      `- [${r.category}] ${r.item} (${r.status})`
    ).join("\n");
    sections.push(`### 디캠프 자원 연결 (${records.resourceConnections.length}건)\n${resources}`);
  }

  return sections.join("\n\n");
}

/**
 * 사용자 프롬프트: 최근 60일 중심 + 유형별 구분 + 간략 타임라인
 */
export function buildBriefingUserPrompt(
  company: Company,
  sessions: MentoringSession[],
  expertRequests: ExpertRequest[],
  analyses: AnalysisResult[],
  coachingRecords?: CompanyCoachingRecords | null,
  slackMessages?: SlackMessage[]
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
  if (company.achievementRate !== undefined) companyFields.push(`- Objective 달성율: ${company.achievementRate}%`);
  // 전담멘토 정보 (AI가 전문가 리소스 요청과 구분할 수 있도록)
  if (company.excel?.dedicatedMentor) companyFields.push(`- 전담멘토: ${company.excel.dedicatedMentor} (★ 전담멘토는 리소스 요청이 아닌 멘토링 세션으로 운영)`);

  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

  return `## 오늘 날짜: ${today}
(이 날짜를 기준으로 모든 이벤트의 시의성을 판단할 것. 이미 지난 마일스톤은 "완료/결과 확인 필요"로 처리.)

## 기업 기본 정보 (Notion DB 최신 데이터 — 화면에 이미 표시됨, 브리핑에 반복 금지)
${companyFields.join("\n")}

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
${slackMessages && slackMessages.length > 0 ? `
## Slack 채널 최근 대화 (${slackMessages.length}건) — 기존 섹션에 녹여서 분석
${slackMessages
  .sort((a, b) => b.date.localeCompare(a.date))
  .slice(0, 15)
  .map((m) => {
    const text = m.text.length > 200 ? m.text.slice(0, 197) + "..." : m.text;
    return `- [${m.date}] ${text}`;
  })
  .join("\n")}
` : ""}
## 데이터 가용성 선언 (★ 아래 범위 밖의 정보를 절대 생성하지 말 것)
- 투자 단계: "${company.investmentStage || "정보 없음"}" ← 이 값만 인용 가능. 라운드명·금액·회차 추가 생성 절대 금지.
- 멘토링 세션: 총 ${sorted.length}건${sorted.length > 0 ? ` (최초 ${sorted[sorted.length - 1].date} ~ 최근 ${sorted[0].date})` : ""}
- 전문가 요청: 총 ${expertRequests.length}건${expertRequests.length === 0 ? " — 전문가 요청 관련 서술 금지" : ""}${coachingRecords ? `\n- 코칭 기록: 플랜 ${coachingRecords.coachingPlans.length}건, 세션 ${coachingRecords.sessions.length}건, 전문가 투입 ${coachingRecords.expertDeployments.length}건 (제공된 기록만 인용 가능)` : ""}
- 위에 제공되지 않은 정량 수치(매출액, MAU, 전환율 등)를 자체 생성하면 환각(hallucination)으로 간주.

[지시사항]
위 데이터를 종합하여 JSON 형식의 심층 브리핑을 생성해주세요.

★ Executive Summary 핵심 규칙:
- oneLiner: 멘토링에서 드러난 가장 사업적 임팩트가 큰 현재 이슈를 한 문장으로. 관찰이 아닌 진단. 회사 소개 금지.
- reportBody: ★★★ 반드시 줄바꿈(\\n)으로 구분된 5~7건 개조식. 연속 문단 절대 금지. 멘토링 내용을 요약하지 말고, "그래서 뭐?"까지 포함된 전략적 진단을 기재. 각 항목 "키워드: 진단+의미" 형식.
- 오늘(${today}) 기준 3개월 이상 지난 마일스톤은 "완료됨" 또는 "결과 추적 필요"로 처리.

분석 깊이 규칙:
- 세션 내용을 그대로 옮기면 가치 제로. PM이 "이건 몰랐는데" 또는 "이렇게 연결되는구나"라고 할 인사이트만 가치 있음.
- 가장 최근 3회 미팅에 가장 높은 가중치. 그 외 세션은 맥락/추세 파악용.
- 숫자가 있으면 숫자 간의 관계/비율에서 의미를 도출할 것. 단순 인용은 인사이트가 아님.
- 같은 주제가 반복되면 "왜 해결 안 되는가?" — 팀 역량인가, 우선순위인가, 구조적 문제인가 진단.
- 이전에 논의되었다가 사라진 주제 추적. 해결됨 vs 포기됨 구분.

일반 규칙:
- 모든 날짜에 반드시 연도를 포함할 것 (예: 2025년 3월, 2026년 1월).
- 노션 데이터의 정량적 수치(매출, DAU, 전환율 등)는 원본 그대로 인용.
- 전문가 요청과 멘토링 내용을 교차 분석. 전담멘토 활동은 멘토링으로 취급.
- Slack 대화가 있으면 멘토링 등 다른 소스와 교차 검증. 별도 섹션 분리 금지.`;
}

/**
 * 병렬 호출용 필드 제한 지시문
 * 동일한 시스템 프롬프트를 공유하되, 출력 범위만 제한하여 prompt caching 극대화
 *
 * Call A (diagnosis): executiveSummary, positiveShifts, repeatPatterns, unspokenSignals
 * Call B (preparation): mentorInsights, meetingStrategy, pmActions
 */
export function buildFieldRestriction(group: "diagnosis" | "preparation"): string {
  if (group === "diagnosis") {
    return `\n\n[출력 범위 제한 — ★★★ 반드시 준수]
이 호출에서는 아래 4개 섹션만 생성하세요. 나머지 섹션은 null로 설정:
- executiveSummary (필수)
- positiveShifts (필수)
- repeatPatterns (필수)
- unspokenSignals (필수)

나머지 필드(mentorInsights, meetingStrategy, pmActions, industryContext)는 null로 반환.
JSON 전체 구조는 유지하되 위 4개 섹션에 모든 분석 역량을 집중할 것.`;
  }

  return `\n\n[출력 범위 제한 — ★★★ 반드시 준수]
이 호출에서는 아래 3개 섹션만 생성하세요. 나머지 섹션은 null로 설정:
- mentorInsights (필수)
- meetingStrategy (필수)
- pmActions (필수)

나머지 필드(executiveSummary, positiveShifts, repeatPatterns, unspokenSignals, industryContext)는 null로 반환.
JSON 전체 구조는 유지하되 위 3개 섹션에 모든 분석 역량을 집중할 것.`;
}
