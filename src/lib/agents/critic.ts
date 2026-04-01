// ══════════════════════════════════════════════════
// ⑥ Critic Agent
// 규칙 기반 팩트체크: 환각/수치 불일치/시의성 등을 검출
// ══════════════════════════════════════════════════

import type { CompanyDataPacket } from "./types";
import type { BriefingResponse } from "@/lib/schemas";

// ── 타입 정의 ──────────────────────────────────────

export interface CriticIssue {
  type: "hallucination" | "weak_evidence" | "missed_signal" | "stale_info" | "quality";
  field: string;
  message: string;
  suggestion?: string;
}

export interface CriticAssessment {
  passed: boolean;
  severity: "pass" | "warning" | "critical";
  issues: CriticIssue[];
  improvementPrompt?: string; // critical일 때 재생성용 프롬프트
}

// ── 메인 함수 ──────────────────────────────────────

/**
 * 규칙 기반 팩트체크 (AI 호출 없음, 즉시 반환)
 */
export function criticizeBriefing(
  briefing: BriefingResponse,
  packet: CompanyDataPacket
): CriticAssessment {
  const issues = runRuleBasedChecks(briefing, packet);
  return buildAssessment(issues);
}

// ── Phase 1: 규칙 기반 팩트체크 ────────────────────

function runRuleBasedChecks(
  briefing: BriefingResponse,
  packet: CompanyDataPacket
): CriticIssue[] {
  const issues: CriticIssue[] = [];

  // 1. 멘토링 회차 검증
  checkSessionCount(briefing, packet, issues);

  // 2. 투자 라운드 환각 검증
  checkInvestmentHallucination(briefing, packet, issues);

  // 3. 날짜 시의성 검증
  checkStaleness(briefing, issues);

  // 4. 전문가 요청 데이터 정합성
  checkExpertRequestConsistency(briefing, packet, issues);

  // 5. 글자 수 제한 검증
  checkLengthConstraints(briefing, issues);

  // 6. 약한 표현 검출
  checkWeakExpressions(briefing, issues);

  return issues;
}

/**
 * 멘토링 회차: 브리핑에서 언급된 회차가 실제 세션 수와 일치하는지
 */
function checkSessionCount(
  briefing: BriefingResponse,
  packet: CompanyDataPacket,
  issues: CriticIssue[]
): void {
  const actualCount = packet.sessions.length;

  // 브리핑 텍스트에서 "N회 멘토링", "N건 세션" 등의 수량 표현 추출
  // "N차"는 서수(ordinal)이므로 제외 — "3차 멘토링" = 3번째 멘토링 (수량 주장 아님)
  const allText = extractAllText(briefing);
  const sessionCountPattern = /(?:총\s*)?(\d+)\s*(?:회|건)\s*(?:멘토링|세션|미팅)/g;
  let match: RegExpExecArray | null;

  while ((match = sessionCountPattern.exec(allText)) !== null) {
    const mentioned = parseInt(match[1], 10);
    // 20% 이상 차이나면 이슈
    if (mentioned > 0 && Math.abs(mentioned - actualCount) / actualCount > 0.2) {
      issues.push({
        type: "hallucination",
        field: "general",
        message: `멘토링 회차 불일치: 브리핑에서 "${match[0]}" 언급, 실제 데이터 ${actualCount}건`,
        suggestion: `실제 세션 수 ${actualCount}건에 맞게 수정`,
      });
    }
  }
}

/**
 * 투자 라운드: company.investmentStage에 없는 라운드가 언급되면 환각
 */
function checkInvestmentHallucination(
  briefing: BriefingResponse,
  packet: CompanyDataPacket,
  issues: CriticIssue[]
): void {
  const investmentStage = packet.company.investmentStage || "";
  const allText = extractAllText(briefing);

  // 투자 관련 키워드 패턴
  const roundPatterns = [
    /(?:시리즈|Series)\s*[A-Z]/gi,
    /Pre-?(?:시드|Seed|A|Series)/gi,
    /(?:시드|Seed)\s*(?:라운드|투자)/gi,
    /(\d+(?:\.\d+)?)\s*(?:억원?|만원)\s*(?:투자|유치|조달)/gi,
  ];

  for (const pattern of roundPatterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(allText)) !== null) {
      const mentioned = match[0];
      // investmentStage에 해당 정보가 없으면 환각 가능성
      if (investmentStage && !investmentStage.toLowerCase().includes(mentioned.toLowerCase().replace(/\s+/g, ""))) {
        // "정보 없음"이거나 빈 값일 때 투자 관련 언급이 있으면 환각
        if (!investmentStage || investmentStage === "정보 없음") {
          issues.push({
            type: "hallucination",
            field: "general",
            message: `투자 정보 환각: "${mentioned}" 언급됨. 데이터에 투자 단계 정보 없음.`,
            suggestion: `투자 관련 언급 삭제. 데이터 투자 단계: "${investmentStage || "정보 없음"}"`,
          });
        }
      }
    }
  }
}

/**
 * 시의성: 3개월 이상 지난 이벤트가 현재형으로 쓰였는지
 */
function checkStaleness(
  briefing: BriefingResponse,
  issues: CriticIssue[]
): void {
  const now = new Date();
  const threeMonthsAgo = new Date(now);
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  // 브리핑에서 날짜 추출
  const allText = extractAllText(briefing);
  const datePattern = /(\d{4})년\s*(\d{1,2})월/g;
  let match: RegExpExecArray | null;

  // 현재형 표현과 결합된 오래된 날짜 검출
  const presentTenseMarkers = ["진행 중", "추진 중", "예정", "계획 중", "준비 중"];

  while ((match = datePattern.exec(allText)) !== null) {
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const eventDate = new Date(year, month - 1);

    if (eventDate < threeMonthsAgo) {
      // 해당 날짜 주변 50자에서 현재형 표현 검색
      const context = allText.slice(
        Math.max(0, match.index - 30),
        Math.min(allText.length, match.index + match[0].length + 50)
      );
      for (const marker of presentTenseMarkers) {
        if (context.includes(marker)) {
          issues.push({
            type: "stale_info",
            field: "general",
            message: `시의성 문제: ${match[0]} 이벤트가 "${marker}"으로 서술됨. 3개월 이상 지남.`,
            suggestion: `"완료됨" 또는 "결과 확인 필요"로 변경`,
          });
          break;
        }
      }
    }
  }
}

/**
 * 전문가 요청: 실제 0건인데 브리핑에서 언급하면 환각
 */
function checkExpertRequestConsistency(
  briefing: BriefingResponse,
  packet: CompanyDataPacket,
  issues: CriticIssue[]
): void {
  const expertCount = packet.expertRequests.length;

  if (expertCount === 0 && briefing.mentorInsights?.currentExpertRequests) {
    const text = briefing.mentorInsights.currentExpertRequests;
    // "없음", "0건", "미활용" 등은 허용
    const negativePatterns = /없음|0건|미활용|미요청|활용하지|요청 없|요청한 바 없/;
    if (text.trim() && !negativePatterns.test(text)) {
      issues.push({
        type: "hallucination",
        field: "mentorInsights.currentExpertRequests",
        message: `전문가 요청 0건인데 내용이 기술됨: "${text.slice(0, 60)}"`,
        suggestion: `전문가 요청 없음으로 수정 또는 필드 비우기`,
      });
    }
  }
}

/**
 * 글자 수 제한: 스키마 제약 준수 확인
 */
function checkLengthConstraints(
  briefing: BriefingResponse,
  issues: CriticIssue[]
): void {
  const checks: { field: string; value: string | undefined; max: number }[] = [
    { field: "executiveSummary.oneLiner", value: briefing.executiveSummary?.oneLiner, max: 60 },
    { field: "executiveSummary.momentumReason", value: briefing.executiveSummary?.momentumReason, max: 50 },
    { field: "executiveSummary.currentPhase", value: briefing.executiveSummary?.currentPhase, max: 20 },
    { field: "meetingStrategy.focus", value: briefing.meetingStrategy?.focus, max: 40 },
    { field: "meetingStrategy.avoid", value: briefing.meetingStrategy?.avoid, max: 40 },
    { field: "meetingStrategy.openingLine", value: briefing.meetingStrategy?.openingLine, max: 40 },
  ];

  for (const check of checks) {
    if (check.value && check.value.length > check.max * 1.5) {
      // 50% 초과 시에만 이슈 (약간의 여유)
      issues.push({
        type: "quality",
        field: check.field,
        message: `글자 수 초과: ${check.value.length}자 (제한 ${check.max}자)`,
        suggestion: `${check.max}자 이내로 축약`,
      });
    }
  }

  // 배열 항목별 글자 수
  for (const [i, item] of (briefing.repeatPatterns || []).entries()) {
    if (item.issue && item.issue.length > 60) {
      issues.push({
        type: "quality",
        field: `repeatPatterns[${i}].issue`,
        message: `글자 수 초과: ${item.issue.length}자 (제한 40자)`,
        suggestion: `40자 이내로 축약`,
      });
    }
  }
}

/**
 * 약한 표현 검출: "~로 보임", "~할 수 있음" 등
 */
function checkWeakExpressions(
  briefing: BriefingResponse,
  issues: CriticIssue[]
): void {
  const weakPatterns = [
    { pattern: /(?:로|으로)\s*보임/g, label: "~로 보임" },
    { pattern: /할\s*수\s*있음/g, label: "~할 수 있음" },
    { pattern: /(?:것으로|듯)\s*(?:보임|판단됨|추정됨)/g, label: "~것으로 보임/추정됨" },
    { pattern: /(?:가능성|개연성)이?\s*(?:있음|존재)/g, label: "가능성이 있음" },
  ];

  // 핵심 섹션에서만 검출 (executiveSummary, repeatPatterns, unspokenSignals)
  const fieldsToCheck: { name: string; text: string }[] = [];

  if (briefing.executiveSummary) {
    fieldsToCheck.push(
      { name: "executiveSummary.oneLiner", text: briefing.executiveSummary.oneLiner || "" },
      { name: "executiveSummary.reportBody", text: briefing.executiveSummary.reportBody || "" },
      { name: "executiveSummary.momentumReason", text: briefing.executiveSummary.momentumReason || "" },
    );
  }
  for (const [i, p] of (briefing.repeatPatterns || []).entries()) {
    fieldsToCheck.push({ name: `repeatPatterns[${i}].structuralCause`, text: p.structuralCause || "" });
  }
  for (const [i, s] of (briefing.unspokenSignals || []).entries()) {
    fieldsToCheck.push({ name: `unspokenSignals[${i}].hypothesis`, text: s.hypothesis || "" });
  }

  for (const { name, text } of fieldsToCheck) {
    for (const { pattern, label } of weakPatterns) {
      pattern.lastIndex = 0; // reset regex state
      if (pattern.test(text)) {
        issues.push({
          type: "weak_evidence",
          field: name,
          message: `약한 표현 "${label}" 사용됨. 데이터 기반 단정적 진단 필요.`,
        });
        break; // 필드당 1건만
      }
    }
  }
}

// ── 유틸리티 ──────────────────────────────────────

/**
 * 브리핑의 모든 텍스트를 하나로 합침 (규칙 기반 검사용)
 */
function extractAllText(briefing: BriefingResponse): string {
  const parts: string[] = [];

  if (briefing.executiveSummary) {
    parts.push(
      briefing.executiveSummary.oneLiner || "",
      briefing.executiveSummary.currentPhase || "",
      briefing.executiveSummary.momentumReason || "",
      briefing.executiveSummary.reportBody || "",
    );
  }

  for (const p of briefing.positiveShifts || []) {
    parts.push(p.shift || "", p.evidence || "");
  }
  for (const r of briefing.repeatPatterns || []) {
    parts.push(r.issue || "", r.structuralCause || "");
  }
  for (const u of briefing.unspokenSignals || []) {
    parts.push(u.signal || "", u.hypothesis || "", u.earlyWarning || "");
  }
  if (briefing.mentorInsights) {
    parts.push(
      briefing.mentorInsights.repeatedAdvice || "",
      briefing.mentorInsights.executedAdvice || "",
      briefing.mentorInsights.ignoredAdvice || "",
      briefing.mentorInsights.currentExpertRequests || "",
      briefing.mentorInsights.gapAnalysis || "",
    );
  }
  if (briefing.meetingStrategy) {
    parts.push(
      briefing.meetingStrategy.focus || "",
      briefing.meetingStrategy.avoid || "",
      briefing.meetingStrategy.openingLine || "",
      ...(briefing.meetingStrategy.keyQuestions || []),
    );
  }
  for (const a of briefing.pmActions || []) {
    parts.push(a.action || "", a.why || "");
  }

  return parts.join(" ");
}

/**
 * 이슈 목록으로 최종 CriticAssessment 생성
 */
function buildAssessment(issues: CriticIssue[]): CriticAssessment {
  if (issues.length === 0) {
    return { passed: true, severity: "pass", issues: [] };
  }

  const hasHallucination = issues.some((i) => i.type === "hallucination");
  const hasCriticalQuality = issues.filter((i) =>
    i.type === "quality" && (
      i.field.startsWith("executiveSummary") ||
      i.field.startsWith("repeatPatterns")
    )
  ).length >= 2;

  const severity: CriticAssessment["severity"] =
    hasHallucination || hasCriticalQuality ? "critical" : "warning";

  const assessment: CriticAssessment = {
    passed: false,
    severity,
    issues,
  };

  // critical일 때 재생성 프롬프트 생성
  if (severity === "critical") {
    assessment.improvementPrompt = buildImprovementPrompt(issues);
  }

  return assessment;
}

/**
 * critical 이슈 기반 2차 Claude 호출용 프롬프트 생성
 * 문제 섹션만 재생성 요청
 */
function buildImprovementPrompt(issues: CriticIssue[]): string {
  const lines: string[] = [
    "아래 이슈가 발견되어 해당 섹션을 수정해야 합니다. 나머지 섹션은 그대로 유지하고, 문제 있는 필드만 수정된 값을 반환하세요.",
    "",
  ];

  for (const issue of issues) {
    const suggestion = issue.suggestion ? ` → ${issue.suggestion}` : "";
    lines.push(`- [${issue.type}] ${issue.field}: ${issue.message}${suggestion}`);
  }

  lines.push("");
  lines.push("수정된 필드만 JSON 객체로 반환하세요. 예: { \"executiveSummary\": { \"oneLiner\": \"수정된 내용\" } }");

  return lines.join("\n");
}
