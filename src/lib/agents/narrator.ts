// ══════════════════════════════════════════════════
// ③ Narrator Agent
// Analyst의 구조화된 분석을 프롬프트에 주입하여
// AI 브리핑 품질을 높이는 프롬프트 빌더
// ══════════════════════════════════════════════════

import type { CompanyDataPacket, AnalystReport, PulseReport } from "./types";
import {
  buildBriefingSystemPrompt,
  buildBriefingUserPrompt,
} from "@/lib/briefing-prompts";

/**
 * Narrator가 생성하는 프롬프트 세트
 */
export interface NarratorPrompts {
  systemPrompt: string;
  userPrompt: string;
}

/**
 * CompanyDataPacket + AnalystReport → 강화된 프롬프트 생성
 * Analyst의 사전 분석 결과를 프롬프트에 포함하여 AI가
 * 패턴 감지에 시간 쓰지 않고 전략적 인사이트에 집중하도록 유도
 */
export function buildEnhancedPrompts(
  packet: CompanyDataPacket,
  analystReport: AnalystReport,
  pulseReport?: PulseReport
): NarratorPrompts {
  const systemPrompt = buildBriefingSystemPrompt();
  const userPrompt = buildEnhancedUserPrompt(packet, analystReport, pulseReport);
  return { systemPrompt, userPrompt };
}

/**
 * 기존 사용자 프롬프트 + Analyst 분석 결과 주입
 */
function buildEnhancedUserPrompt(
  packet: CompanyDataPacket,
  report: AnalystReport,
  pulse?: PulseReport
): string {
  const { company, sessions, expertRequests, analyses } = packet;

  // 기존 프롬프트를 기본으로 생성 (Slack 메시지 포함)
  const basePrompt = buildBriefingUserPrompt(
    company, sessions, expertRequests, analyses,
    packet.coachingRecords,
    packet.slackMessages
  );

  // Analyst 분석 결과 + Pulse 정성 평가를 추가 섹션으로 주입
  const analystSection = buildAnalystSection(report);
  const pulseSection = pulse ? buildPulseSection(pulse) : "";

  // 기존 프롬프트의 [지시사항] 앞에 삽입
  const combined = [analystSection, pulseSection].filter(Boolean).join("\n\n");
  const insertPoint = basePrompt.indexOf("[지시사항]");
  if (insertPoint >= 0) {
    return basePrompt.slice(0, insertPoint) + combined + "\n\n" + basePrompt.slice(insertPoint);
  }

  // [지시사항]이 없으면 끝에 추가
  return basePrompt + "\n\n" + combined;
}

/**
 * Analyst Report를 프롬프트 텍스트로 변환
 */
function buildAnalystSection(report: AnalystReport): string {
  const sections: string[] = [];

  sections.push("## 📊 사전 분석 결과 (Analyst Agent — 아래 인사이트를 반드시 참고하여 브리핑에 반영)");

  // 반복 등장 토픽 → repeatPatterns 생성에 직접 활용
  if (report.topicAnalysis.recurringTopics.length > 0) {
    sections.push("\n### 반복 등장 토픽 → repeatPatterns 후보");
    sections.push(
      report.topicAnalysis.recurringTopics
        .map((t) => `- "${t.topic}" ${t.frequency}회 반복 (세션: ${t.sessions.slice(0, 3).join(", ")})`)
        .join("\n")
    );
  }

  if (report.topicAnalysis.recentFocus.length > 0) {
    sections.push(`\n### 최근 포커스: ${report.topicAnalysis.recentFocus.join(", ")}`);
  }

  // 의미론적 토픽 클러스터 (Topic Analyst 2차 에이전트 결과)
  if (report.topicAnalysis.semanticClusters?.length) {
    sections.push("\n### 의미론적 토픽 클러스터 (AI 분석)");
    sections.push(
      report.topicAnalysis.semanticClusters
        .map((c) => `- **${c.topic}**: ${c.summary} (키워드: ${c.keywords.join(", ")})`)
        .join("\n")
    );
  }
  if (report.topicAnalysis.recentNarrative) {
    sections.push(`\n### 최근 세션 맥락: ${report.topicAnalysis.recentNarrative}`);
  }
  if (report.topicAnalysis.topicEvolution) {
    sections.push(`\n### 토픽 변화 흐름: ${report.topicAnalysis.topicEvolution}`);
  }

  // 반복 조언 테마 → mentorInsights.repeatedAdvice 생성에 활용
  if (report.mentorPatterns.adviceThemes.length > 0) {
    sections.push("\n### 반복 조언 테마 → mentorInsights.repeatedAdvice 참고");
    sections.push(
      report.mentorPatterns.adviceThemes
        .map((t) => `- "${t.theme}": ${t.count}회 반복`)
        .join("\n")
    );
  }

  // 데이터 풍부도 & 보상 전략
  if (report.dataRichness.level !== "rich") {
    sections.push(`\n### ⚡ 데이터 풍부도: ${report.dataRichness.level === "sparse" ? "부족" : "보통"} (세션 ${report.dataRichness.sessionCount}건)`);
    if (report.dataRichness.compensationStrategy) {
      sections.push(`보상 전략: ${report.dataRichness.compensationStrategy}`);
    }
  }

  // 멘토 조언 이행 추적
  if (report.adviceTracking.tracked.length > 0) {
    sections.push(`\n### 멘토 조언 이행 추적 → mentorInsights.executedAdvice / ignoredAdvice 참고`);
    sections.push(`- ${report.adviceTracking.summary}`);

    const executed = report.adviceTracking.tracked.filter((t) => t.executed).slice(0, 3);
    if (executed.length > 0) {
      sections.push("- 이행 확인된 조언:");
      for (const e of executed) {
        sections.push(`  · [${e.sessionDate}] "${e.keywords.join(", ")}" → [${e.evidenceDate}] ${e.evidenceSnippet || "이행 확인"}`);
      }
    }

    const unexecuted = report.adviceTracking.tracked.filter((t) => !t.executed).slice(0, 3);
    if (unexecuted.length > 0) {
      sections.push("- 미이행 조언 (ignoredAdvice 후보):");
      for (const u of unexecuted) {
        sections.push(`  · [${u.sessionDate}] "${u.keywords.join(", ")}" — 후속 세션에서 이행 증거 미발견`);
      }
    }
  }

  // 컨텍스트 요약
  sections.push(`\n### Analyst 컨텍스트 요약\n${report.narrativeContext}`);

  // 분석 방향 유도 (AI가 표면 요약이 아닌 깊은 진단을 하도록 유도)
  sections.push(`\n### ★ 분석 시 반드시 답해야 할 질문`);
  const guidingQuestions: string[] = [];

  // 반복 토픽이 있으면 "왜 해결 안 되는가?" 질문
  if (report.topicAnalysis.recurringTopics.length > 0) {
    const top = report.topicAnalysis.recurringTopics[0];
    guidingQuestions.push(
      `"${top.topic}"이 ${top.frequency}회 반복 등장함. 왜 해결되지 않는가? 팀 역량 문제인가, 우선순위 문제인가, 구조적 문제인가?`
    );
  }

  // 조언 이행율이 낮으면 질문
  if (report.adviceTracking.executionRate < 0.5 && report.adviceTracking.tracked.length >= 3) {
    guidingQuestions.push(
      `멘토 조언 이행율이 ${Math.round(report.adviceTracking.executionRate * 100)}%로 낮음. 팀이 조언을 안 듣는 건지, 못 실행하는 건지 구분하여 진단할 것.`
    );
  }

  // 최근 포커스 vs 이전 포커스 차이가 있으면 소멸 신호 질문
  if (report.topicAnalysis.recentFocus.length > 0 && report.topicAnalysis.topKeywords.length > 3) {
    const pastTopics = report.topicAnalysis.topKeywords
      .filter((k) => !report.topicAnalysis.recentFocus.includes(k.keyword))
      .slice(0, 2);
    if (pastTopics.length > 0) {
      guidingQuestions.push(
        `과거 빈출 키워드 "${pastTopics.map((t) => t.keyword).join(", ")}"이 최근 세션에서 사라짐. 해결된 건지 포기된 건지 판단할 것.`
      );
    }
  }

  if (guidingQuestions.length === 0) {
    guidingQuestions.push("이 팀의 가장 큰 사업적 위험이 무엇인지, 데이터 행간에서 추론할 것.");
  }

  sections.push(guidingQuestions.map((q) => `- ${q}`).join("\n"));

  return sections.join("\n");
}

/**
 * PulseReport → 멘토링 준비에 실질적으로 도움이 되는 프롬프트 섹션
 * AI가 이 정보를 반영하여 meetingStrategy, mentorInsights 등을 작성하도록 유도
 */
function buildPulseSection(pulse: PulseReport): string {
  const sections: string[] = [];
  const qa = pulse.qualitativeAssessment;

  sections.push("## 🏥 팀 펄스 (Pulse Tracker — 멘토링 준비 시 반드시 참고)");

  // 종합 서술 평가
  sections.push(`\n### 종합 평가\n${qa.overallNarrative}`);

  // 멘토링 정기성 → meetingStrategy에 반영 유도
  sections.push(`\n### 멘토링 정기성 (meetingStrategy 참고)`);
  sections.push(`- ${qa.mentoringRegularity.assessment}`);
  const monthDetail = qa.mentoringRegularity.recentMonthBreakdown
    .map((m) => `${m.month}: ${m.count}건`)
    .join(", ");
  sections.push(`- 최근 3개월: ${monthDetail}`);
  if (!qa.mentoringRegularity.meetsMonthlyTarget) {
    sections.push("- ★ 월 1회 미만 진행 중 → openingLine에서 최근 공백 언급 권장, meetingStrategy.focus에 반영");
  }

  // 전담멘토 관계 → mentorInsights에 반영 유도
  sections.push(`\n### 전담멘토 관계 (mentorInsights 참고)`);
  sections.push(`- ${qa.dedicatedMentorEngagement.assessment}`);
  if (qa.dedicatedMentorEngagement.hasDedicatedMentor && !qa.dedicatedMentorEngagement.isRegular) {
    sections.push("- ★ 전담멘토와 정기 만남 미확보 → gapAnalysis에 반영 권장");
  }

  // 전문가 요청 활용 → mentorInsights.currentExpertRequests에 반영 유도
  sections.push(`\n### 전문가 리소스 활용도 (mentorInsights.currentExpertRequests 참고)`);
  sections.push(`- ${qa.expertRequestActivity.assessment}`);
  if (qa.expertRequestActivity.totalRequests === 0) {
    sections.push("- ★ 전문가 요청 미활용 → pmActions에 디캠프 전문가 리소스 안내 액션 추가 권장");
  }

  // 주의가 필요한 건강 신호만 선별
  const warnings = pulse.healthSignals.filter((s) => s.status !== "good");
  if (warnings.length > 0) {
    sections.push("\n### 주의 신호");
    for (const w of warnings) {
      sections.push(`- [${w.status}] ${w.signal}: ${w.detail}`);
    }
  }

  return sections.join("\n");
}
