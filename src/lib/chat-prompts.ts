import type {
  Company,
  MentoringSession,
  ExpertRequest,
  KptReview,
  OkrItem,
  OkrValue,
  CompanyBriefing,
} from "@/types";
import {
  truncate,
  formatRecentSessionsGrouped,
  formatOlderSessionsBrief,
  formatExpertRequests,
  formatKptReviews,
  formatOkrItems,
  formatOkrValues,
} from "@/lib/briefing-prompts";

// ══════════════════════════════════════════════════
// 챗용 시스템 프롬프트 + 컨텍스트 빌더
// briefing-prompts.ts의 데이터 포맷팅 헬퍼를 재활용
// ══════════════════════════════════════════════════

/**
 * 챗 시스템 프롬프트: dcamp PM 전용 AI 어시스턴트
 * 기업의 전체 맥락을 알고 있는 상태에서 자연어 대화
 */
export function buildChatSystemPrompt(companyName: string): string {
  const today = new Date().toISOString().split("T")[0];

  return `[역할]
당신은 dcamp(은행권청년창업재단) PM 전용 AI 어시스턴트입니다.
"${companyName}"의 전체 데이터(멘토링 회의록, KPT 회고, OKR, 전문가 요청, AI 브리핑)를 컨텍스트로 보유하고 있습니다.
PM이 이 기업에 대해 궁금한 점을 자유롭게 질문하면, 데이터에 기반하여 정확하고 실용적인 답변을 제공합니다.

[오늘 날짜] ${today}
- 이 날짜를 기준으로 시의성을 판단할 것
- 3개월 이상 지난 이벤트는 "완료됨" 또는 "결과 확인 필요"로 처리

[응답 원칙]
1. 데이터 기반: 추측 금지. 데이터에 근거한 답변만. 근거 없으면 "해당 데이터가 없습니다" 명시.
2. 간결 개조식: 핵심을 빠르게 전달. 불필요한 수식어 제거. 개조식 우선.
3. 전문 용어 해설: 영문 약어(CAC, LTV 등) 사용 시 괄호 안에 쉬운 뜻풀이 필수.
4. 날짜 명시: 모든 날짜에 연도 포함 (예: 2025년 3월).
5. 실행 가능: 분석뿐 아니라 구체적 액션/질문/전략을 제안.
6. 마크다운 활용: 제목(##), 볼드(**), 리스트(-) 등으로 가독성 확보.

[금지 사항]
- 기업 기본 정보(투자단계, 팀규모 등) 반복 나열 금지 — 이미 화면에 표시됨
- 데이터에 없는 내용을 지어내는 행위 금지
- 장황한 서론/마무리 금지`;
}

/**
 * 기업 전체 데이터를 챗 컨텍스트 문자열로 조립
 * briefing-prompts.ts의 포맷팅 헬퍼 재활용
 */
export function buildChatContext(
  company: Company,
  sessions: MentoringSession[],
  expertRequests: ExpertRequest[],
  kptReviews: KptReview[],
  okrItems: OkrItem[],
  okrValues: OkrValue[],
  briefing?: CompanyBriefing | null,
): string {
  // 세션 정렬 및 분리 (최근 3개월 기준)
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 90);
  const cutoffStr = cutoffDate.toISOString().split("T")[0];

  const sorted = [...sessions].sort((a, b) => b.date.localeCompare(a.date));
  const within3mo = sorted.filter((s) => s.date >= cutoffStr);
  const recentSessions = within3mo.length >= 5
    ? within3mo
    : sorted.slice(0, Math.max(within3mo.length, 5));
  const recentIds = new Set(recentSessions.map((s) => s.notionPageId));
  const olderSessions = sorted.filter((s) => !recentIds.has(s.notionPageId));

  // 기업 기본 정보
  const companyInfo = [
    `기업명: ${company.name}`,
    company.batchLabel ? `배치: ${company.batchLabel}` : null,
    company.description ? `소개: ${truncate(company.description, 200)}` : null,
    company.investmentStage ? `투자 단계: ${company.investmentStage}` : null,
    company.industryNames?.length ? `산업: ${company.industryNames.join(", ")}` : null,
    company.teamSize ? `팀 규모: ${company.teamSize}명` : null,
  ].filter(Boolean).join("\n");

  // 기존 브리핑 요약 (있으면 포함)
  let briefingSection = "";
  if (briefing?.executiveSummary) {
    const es = briefing.executiveSummary;
    briefingSection = `\n## 기존 AI 브리핑 요약
- 핵심: ${es.oneLiner}
- 현재 단계: ${es.currentPhase}
- 모멘텀: ${es.momentum} — ${es.momentumReason}
${es.reportBody ? `- 주요 현황:\n${es.reportBody}` : ""}`;
  }

  return `## 기업 기본 정보
${companyInfo}
${briefingSection}

## OKR 현황
### 성과지표 항목 (${okrItems.length}건)
${formatOkrItems(okrItems)}

### 성과지표 측정값 (${okrValues.length}건)
${formatOkrValues(okrValues)}

## KPT 회고 (${kptReviews.length}건)
${formatKptReviews(kptReviews)}

## 주요 멘토링 세션 (${recentSessions.length}건, 최근 3개월 우선)
${formatRecentSessionsGrouped(recentSessions)}

## 이전 세션 타임라인 (${olderSessions.length}건)
${formatOlderSessionsBrief(olderSessions)}

## 전문가 리소스 요청 (${expertRequests.length}건)
${formatExpertRequests(expertRequests)}`;
}
