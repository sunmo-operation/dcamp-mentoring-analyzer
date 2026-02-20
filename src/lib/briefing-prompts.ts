import type {
  Company,
  MentoringSession,
  ExpertRequest,
  AnalysisResult,
  KptReview,
  OkrItem,
  OkrValue,
} from "@/types";

// ══════════════════════════════════════════════════
// 브리핑 v3 — 심층 분석 프롬프트 (최근 데이터 중심)
// ══════════════════════════════════════════════════

/**
 * 시스템 프롬프트: 심사역 수준의 진단 + JSON 출력 스키마
 */
export function buildBriefingSystemPrompt(): string {
  return `당신은 최고 수준의 스타트업 액셀러레이터 심사역입니다.
dcamp PM이 멘토 미팅 직전에 읽을 브리핑을 작성하세요.

규칙:
- 최근 1~2개월 미팅을 주요 근거로 삼되, 가중치는 미팅 성격에 따라 판단
  (점검/체크업은 현황 파악용, 멘토 세션은 심층 인사이트용, 회고는 자기인식용)
- 단순 요약 금지. 데이터 간 연결과 패턴에서 인사이트 추출
- 같은 주제가 반복되면 "왜 해결 안 되는가"의 구조적 원인까지 파고들 것. 증상(캐시 문제, 인력 부족 등)을 다시 나열하는 것은 요약이지 진단이 아님. 조직·의사결정·리소스·우선순위 중 어디가 막히는지 써야 진단임
- 기업이 말한 것과 실제로 한 것이 다르면 반드시 지적
- 전문가 요청 이력과 멘토링 내용을 교차 분석할 것
- 반드시 JSON으로만 반환. JSON 외 텍스트 포함 금지.
- 모든 텍스트는 한국어로 작성.
- 근거 없는 추측 금지. 데이터에 기반한 판단만 포함.

톤 & 스타일:
- 전문 컨설팅 보고서 어조를 유지할 것. 격식체 사용.
- 핵심 논점 → 근거 → 시사점 순서로 구성.
- 개조식(불릿 포인트)으로 작성할 때는 각 항목이 구체적이고 실행 가능해야 함.
- 추상적 표현 금지. "잘 되고 있다", "노력이 필요하다" 같은 표현 대신 구체적 사실과 수치로 서술.

간결성 규칙 (응답 속도를 위해 반드시 준수):
- 각 텍스트 필드는 최대 2~3문장으로 간결하게 작성
- repeatPatterns: 핵심 3건 이내
- unspokenSignals: 2건 이내
- pmActions: 3건 이내
- structuralCause: 핵심만 3~4문장으로 압축
- competitors: 직접 경쟁사 2~3개만 (확실한 것만)
- industryTrends: 핵심 2건 이내
- regulatoryAndPolicy: 임팩트 큰 것 2건 이내

출력 JSON 스키마:

{
  "executiveSummary": {
    "oneLiner": "이 기업의 현재 핵심 상황을 한 문장으로",
    "currentPhase": "현재 단계 (예: PMF 탐색 중 / 채널 검증 단계 / 스케일업 초입)",
    "momentum": "positive | neutral | negative | critical",
    "momentumReason": "모멘텀 판단의 핵심 근거 1~2문장",
    "reportBody": "멘토링/체크업에서 나온 핵심 지표와 수치를 개조식으로 나열. 각 항목을 줄바꿈으로 구분. 수치가 없으면 '주요 수치 미언급'."
  },
  "okrDiagnosis": {
    "overallRate": "전체 OKR 달성율 (0~100 숫자, OKR 데이터 없으면 null)",
    "objectives": [
      {
        "name": "오브젝티브 명",
        "achievementRate": "달성율 (0~100 숫자)",
        "achieved": "true/false"
      }
    ],
    "trendAnalysis": "지표값 추이 분석 — 개선/정체/악화 패턴과 그 의미",
    "metricVsNarrative": "멘토링에서 말하는 상황과 실제 지표가 다른 지점. 없으면 null."
  },
  "repeatPatterns": [
    {
      "issue": "인사이트 제목 (핵심을 한 줄로)",
      "issueCategory": "전략 | 조직 | 실행 | 시장 | 제품 | 재무 | 멘토링",
      "firstSeen": "근거 출처 (예: 3차 점검미팅, KPT 2월, 전문가 요청 등)",
      "occurrences": "관련된 미팅/데이터 건수 (숫자)",
      "structuralCause": "이 문제가 N번 반복됐는데 왜 아직 해결이 안 됐는가? 증상 나열 금지. 조직 구조·의사결정 주체·리소스 배분·우선순위 충돌 중 어디서 막히는지를 1문단으로 진단.",
      "urgency": "high | medium | low"
    }
  ],
  "unspokenSignals": [
    {
      "signal": "공식적으로 말하지 않았지만 행간에서 읽히는 것",
      "detectedFrom": "감지 출처 (몇 차 멘토링 / KPT / 전문가 요청 등)",
      "hypothesis": "",
      "earlyWarning": "이게 현실화되면 어떤 문제가 생기는가"
    }
  ],
  "mentorInsights": {
    "repeatedAdvice": "멘토가 반복 강조한 조언들을 개조식으로 나열. 구체적으로.",
    "executedAdvice": "현재 멘토-기업 매칭의 적합성 코멘트. 멘토 전문성이 기업 니즈와 맞는지.",
    "ignoredAdvice": "반복됐지만 실행 안 된 조언들을 개조식으로 나열. 각각 왜 안 됐을지 가설 포함.",
    "currentExpertRequests": "가장 시급한 리소스 니즈를 첫 줄에 한 문장으로. 줄바꿈 후 왜 시급한지 1~2문장으로 설명.",
    "gapAnalysis": "dcamp가 지원할 수 있는 구체적 방안들을 개조식으로 나열"
  },
  "meetingStrategy": {
    "focus": "이번 세션 단 하나의 핵심 주제",
    "avoid": "이번 미팅에서 피해야 할 것",
    "keyQuestions": [
      "날카롭고 구체적인 질문 1",
      "날카롭고 구체적인 질문 2",
      "날카롭고 구체적인 질문 3"
    ],
    "openingLine": "이번 미팅에서 특별히 주목해야 할 것 (기업 반응, 회피 여부 등)"
  },
  "pmActions": [
    {
      "priority": 1,
      "action": "PM이 미팅 전/후 해야 할 것 (구체적으로)",
      "deadline": "언제까지",
      "why": "왜 지금"
    }
  ],
  "industryContext": {
    "competitors": [
      {
        "name": "경쟁 서비스/스타트업 명",
        "description": "해당 경쟁사가 무엇을 하는지 한 문장으로",
        "stage": "경쟁사 성장 단계 (시드/프리A/시리즈A/B 등)",
        "similarity": "우리 기업과 정확히 어떤 점에서 경쟁하는지 (타겟 고객, 기술 접근법, 비즈니스 모델 등 구체적으로)",
        "differentiation": "우리 기업의 차별점 또는 상대적 약점",
        "recentMove": "최근 알려진 동향 (투자 유치, 제품 출시, 시장 확장 등)",
        "threatLevel": "high | medium | low"
      }
    ],
    "industryTrends": [
      {
        "trend": "이 기업이 속한 세부 시장의 핵심 트렌드",
        "impact": "이 기업의 전략/실행에 미치는 구체적 영향",
        "source": "근거 출처 (보고서, 매체, 투자 동향 등)"
      }
    ],
    "regulatoryAndPolicy": [
      {
        "title": "법령 변경 / 정부 지원사업 / 정책 변화 등",
        "type": "법령 | 지원사업 | 정책 | 업계소식",
        "impact": "이 기업에 미치는 구체적 영향",
        "actionRequired": "필요한 대응 또는 신청 방법"
      }
    ],
    "marketInsight": "이 기업의 세부 시장에 대한 핵심 인사이트 1~2문장"
  }
}

[인사이트 분류 기준 — 반드시 아래 9개 중 하나만 사용]
repeatPatterns의 issueCategory는 반드시 아래 9개 카테고리 중 하나로 분류:
전략 / 마케팅 / 영업 / 제품 / 기술 / HR·조직 / 재무 / 운영 / 멘토링
(예: 채용·팀빌딩 → "HR·조직", GTM·브랜딩 → "마케팅", 고객 확보·매출 → "영업", 기술 부채·인프라 → "기술", 프로세스·실행력 → "운영", 시장 포지셔닝 → "전략")

[경쟁서비스 분석 기준 — 구체적으로 정의할 것]
- 단순히 같은 산업이라고 경쟁사로 분류하지 말 것. "로봇 업계" 같은 뭉뚱그린 분류 금지.
- 기업의 구체적인 제품/서비스, 타겟 고객 세그먼트, 기술 접근법, 비즈니스 모델을 기준으로 직접 경쟁하는 서비스를 식별.
- 투자 단계와 팀 규모가 비슷한 스타트업 중심으로 분석하되, 시장 선도 기업도 벤치마크로 포함 가능.
- 해외 유사 서비스도 포함 (국내에 직접 경쟁사가 없는 경우 특히 중요).
- 확실하지 않은 경쟁사는 포함하지 말 것. 구체적 근거가 있는 것만 포함.

[법령·정책·지원사업 기준]
- 이 기업의 산업/제품에 직접 영향을 주는 것만 포함.
- 임팩트가 큰 것 위주. 사소한 변경 제외.
- 스타트업 지원사업은 이 기업이 실제로 신청 가능한 것만 포함.
- type은 "법령" | "지원사업" | "정책" | "업계소식" 중 하나.

[OKR 처리]
- OKR 데이터가 제공되면 okrDiagnosis를 채울 것.
- OKR 데이터가 없으면 okrDiagnosis를 null로 설정.

[업계 동향 처리]
- 기업 기본 정보(산업, 제품, 투자 단계 등)를 면밀히 분석하여 가장 관련성 높은 경쟁사/트렌드/정책만 포함.
- 데이터가 부족하여 판단이 어려우면 industryContext를 null로 설정.`;
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
  if (sessions.length === 0) return "최근 60일간 멘토링 기록 없음";

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

    sections.push(`\n### [${groupName}] (${groupSessions.length}건)`);
    for (const s of groupSessions) {
      const summary = s.summary ? truncate(s.summary, 400) : "요약 없음";
      const followUp = s.followUp ? `\n  후속조치: ${truncate(s.followUp, 200)}` : "";
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

  return sessions
    .slice(0, 15)
    .map((s) => {
      const types = s.sessionTypes.join("/");
      return `- [${s.date}] [${types}] ${s.title}`;
    })
    .join("\n");
}

function formatExpertRequests(requests: ExpertRequest[]): string {
  if (requests.length === 0) return "전문가 요청 없음";

  return requests
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

  return reviews
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
  const sorted = [...items].sort(
    (a, b) => (order[a.level] ?? 9) - (order[b.level] ?? 9)
  );

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

  return values
    .map((v) => {
      const period = v.periodMonth || v.period || "기간 미상";
      const current = v.currentValue !== undefined ? v.currentValue : "없음";
      const target = v.targetValue || "없음";
      const level = v.level || "";
      return `- [${period}] ${level ? `[${level}] ` : ""}현재: ${current} / 목표: ${target}`;
    })
    .join("\n");
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
  okrValues: OkrValue[]
): string {
  const batchPeriod =
    company.batchStartDate && company.batchEndDate
      ? `${company.batchStartDate} ~ ${company.batchEndDate}`
      : "정보 없음";

  // 60일 기준으로 세션 분리
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 60);
  const cutoffStr = cutoffDate.toISOString().split("T")[0];

  // 날짜 내림차순 정렬
  const sorted = [...sessions].sort((a, b) => b.date.localeCompare(a.date));
  const recentSessions = sorted.filter((s) => s.date >= cutoffStr);
  const olderSessions = sorted.filter((s) => s.date < cutoffStr);

  return `## 기업 기본 정보
- 기업명: ${company.name}
- 배치: ${company.batchLabel || "정보 없음"} (기간: ${batchPeriod})
- 투자 단계: ${company.investmentStage || "정보 없음"}
- 제품 성숙도: ${company.productMaturity || "정보 없음"} / 기술 성숙도: ${company.techMaturity || "정보 없음"}
- 산업 분야: ${company.industryNames?.join(", ") || "정보 없음"}
- 팀 규모: ${company.teamSize || "정보 없음"}명

## OKR 현황
### 성과지표 항목 (${okrItems.length}건)
${formatOkrItems(okrItems)}

### 성과지표 측정값 (${okrValues.length}건)
${formatOkrValues(okrValues)}

## KPT 회고 (${kptReviews.length}건)
${formatKptReviews(kptReviews)}

## 최근 60일 멘토링 세션 (${recentSessions.length}건) — 분석 주요 근거
${formatRecentSessionsGrouped(recentSessions)}

## 이전 세션 타임라인 (${olderSessions.length}건) — 맥락 참고용
${formatOlderSessionsBrief(olderSessions)}

## 전문가 리소스 요청 (${expertRequests.length}건)
${formatExpertRequests(expertRequests)}

## AI 분석 결과 이력 (${analyses.length}건)
${formatAnalyses(analyses)}

[지시사항]
위 데이터를 종합하여 JSON 형식의 심층 브리핑을 생성해주세요.
- 최근 60일 세션이 핵심 근거. 이전 세션은 맥락/추세 파악용으로만 참고.
- OKR 데이터가 있으면 okrDiagnosis를 채우고, 없으면 null.
- 전문가 요청과 멘토링 내용을 교차 분석하여 인사이트 도출.
- KPT Problem과 멘토링 행간에서 unspokenSignals를 추론.`;
}
