import type { Company, TimelineEvent, ExpertRequest } from "@/types";

// ── 타임라인 포맷팅 ────────────────────────────────
function formatMentoringTimeline(events: TimelineEvent[]): string {
  if (events.length === 0) return "기록 없음";

  // 날짜 오름차순 정렬
  const sorted = [...events].sort((a, b) => a.date.localeCompare(b.date));

  return sorted
    .map((e) => {
      const typeLabel =
        e.type === "mentoring"
          ? "멘토링"
          : e.type === "checkpoint"
            ? "점검/회고"
            : e.type === "expert_request"
              ? "전문가투입"
              : e.type === "company_update"
                ? "기업근황"
                : "회의";
      const participants = e.metadata.participants?.length
        ? ` / 참석: ${e.metadata.participants.length}명`
        : "";
      const summary = e.rawContent
        ? ` / ${e.rawContent.slice(0, 150)}`
        : "";
      return `- [${e.date}] [${typeLabel}] ${e.title}${participants}${summary}`;
    })
    .join("\n");
}

// ── 전문가 요청 포맷팅 ──────────────────────────────
function formatExpertRequests(requests: ExpertRequest[]): string {
  if (requests.length === 0) return "전문가 요청 없음";

  return requests
    .map((r) => {
      const date = r.requestedAt?.split("T")[0] || "날짜 미상";
      const status = r.status || "접수";
      const urgency = r.urgency || "보통";
      const oneLiner = r.oneLiner || "요약 없음";
      const problem = r.problem ? ` / ${r.problem.slice(0, 120)}` : "";
      return `- [${date}] [${status}] [${urgency}] ${oneLiner}${problem}`;
    })
    .join("\n");
}

// ══════════════════════════════════════════════════
// 시스템 프롬프트 (동적 — 기업 컨텍스트 포함)
// ══════════════════════════════════════════════════
export function buildSystemPrompt(
  company: Company,
  context: {
    timeline: TimelineEvent[];
    expertRequests: ExpertRequest[];
  }
): string {
  const batchPeriod =
    company.batchStartDate && company.batchEndDate
      ? `${company.batchStartDate} ~ ${company.batchEndDate}`
      : "정보 없음";

  const mentoringTimeline = formatMentoringTimeline(context.timeline);
  const expertRequestsText = formatExpertRequests(context.expertRequests);

  return `당신은 dcamp 멘토링 분석 전문가입니다.

[기업 기본 정보]
- 기업명: ${company.name}
- 배치: ${company.batchLabel || "정보 없음"} (기간: ${batchPeriod})
- 투자 단계: ${company.investmentStage || "정보 없음"}
- 제품 성숙도: ${company.productMaturity || "정보 없음"} / 기술 성숙도: ${company.techMaturity || "정보 없음"}
- 고객 규모: ${company.customerScaleRaw || "정보 없음"}
- 거래 유형: ${company.dealType?.join(", ") || "정보 없음"}

[기수 전체 활동 컨텍스트]

▶ 멘토링 및 회의 이력 (기수 시작부터 전체)
${mentoringTimeline}
※ 날짜 오름차순, 회의구분/참석멘토/요약 포함

▶ 전문가 리소스 요청 이력 (전체)
${expertRequestsText}
※ 형식: [요청일] [상태] [긴급성] 한줄요약 / 해결할 문제

▶ Slack 채널 활동 (기수 시작부터, 보조 참고용)
Slack 연동 미설정
※ Slack은 맥락 참고용. 분석 주된 근거는 아래 멘토링 원문.
※ Slack 데이터가 없으면 이 섹션은 무시하세요.

[분석 지침]
- 위 기업 컨텍스트를 반드시 참고하여 분석하세요.
- 이전 멘토링/회의에서 반복되는 이슈 패턴이 있으면 지적하세요.
- 미요청 이슈 중 전문가 필요한 것 → recommendedActions에 "전문가 요청 권고"로 표시
- 표면 이슈와 근본 과제를 명확히 구분하세요.
- 모든 분석은 원문에서의 근거를 제시하세요.
- 추천 액션은 구체적이고 실행 가능해야 합니다.

[출력 형식]
반드시 아래 JSON 형식으로만 응답하세요. JSON 외에 다른 텍스트를 포함하지 마세요.

{
  "summary": {
    "oneLiner": "한 줄 요약 (30자 이내)",
    "keyTopics": ["주요 논의 주제 3~5개"],
    "duration": "예상 멘토링 소요 시간"
  },
  "surfaceIssues": [
    {
      "statement": "팀이 직접 언급한 문제/고민",
      "context": "해당 발언의 맥락 설명"
    }
  ],
  "rootCauses": [
    {
      "title": "근본 과제 제목",
      "description": "표면 이슈 아래 숨어있는 구조적 원인 분석",
      "severity": "high|medium|low",
      "category": "Product|Team|GTM|Finance|Tech|Legal",
      "evidence": "원문에서의 근거 인용 또는 요약"
    }
  ],
  "recommendedActions": [
    {
      "action": "구체적인 액션 아이템",
      "owner": "누가 해야 하는지 (팀/멘토/PM/전문가 요청 권고)",
      "priority": "urgent|high|medium|low",
      "timeline": "실행 시간 프레임",
      "expectedOutcome": "기대 효과"
    }
  ],
  "riskSignals": [
    {
      "signal": "감지된 리스크",
      "type": "시장|팀|재무|기술|법률",
      "severity": "critical|warning|watch",
      "mitigation": "대응 방안"
    }
  ]
}`;
}

// ══════════════════════════════════════════════════
// 사용자 프롬프트 (멘토링 원문)
// ══════════════════════════════════════════════════
export function buildUserPrompt(
  transcript: string,
  mentorName: string,
  topic: string,
  mentoringDate: string
): string {
  return `## 금번 멘토링 정보
- 멘토: ${mentorName}
- 주제: ${topic}
- 날짜: ${mentoringDate}

## 멘토링 원문
${transcript}

위 멘토링 원문을 [기업 기본 정보]와 [기수 전체 활동 컨텍스트]를 참고하여 분석하고, JSON 형식으로 결과를 제공해주세요.`;
}
