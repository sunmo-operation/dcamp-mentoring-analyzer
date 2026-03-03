// ══════════════════════════════════════════════════
// ③ Narrator Agent
// Analyst의 구조화된 분석을 프롬프트에 주입하여
// AI 브리핑 품질을 높이는 프롬프트 빌더
// ══════════════════════════════════════════════════

import type { CompanyDataPacket, AnalystReport, PulseReport } from "./types";
import {
  buildBriefingSystemPrompt,
  buildBriefingUserPrompt,
  formatRecentSessionsGrouped,
  formatOlderSessionsBrief,
  formatExpertRequests,
  formatAnalyses,
  formatKptReviews,
  formatOkrItems,
  formatOkrValues,
  truncate,
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
  const { company, sessions, expertRequests, analyses, kptReviews, okrItems, okrValues, batchData } = packet;

  // 기존 프롬프트를 기본으로 생성 (Slack 메시지 포함)
  const basePrompt = buildBriefingUserPrompt(
    company, sessions, expertRequests, analyses,
    kptReviews, okrItems, okrValues, batchData,
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

  // 1. 토픽 분석
  if (report.topicAnalysis.topKeywords.length > 0) {
    sections.push("\n### 주요 토픽 빈도 (데이터 기반)");
    sections.push(
      report.topicAnalysis.topKeywords
        .slice(0, 7)
        .map((k) => `- ${k.keyword}: ${k.count}회 (마지막: ${k.lastSeen})`)
        .join("\n")
    );
  }

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

  // 2. 멘토 패턴
  if (report.mentorPatterns.mentors.length > 0) {
    sections.push("\n### 멘토 참여 현황");
    sections.push(
      report.mentorPatterns.mentors
        .slice(0, 5)
        .map((m) => `- ${m.name}: ${m.sessionCount}회 (마지막: ${m.lastDate})`)
        .join("\n")
    );
  }

  if (report.mentorPatterns.adviceThemes.length > 0) {
    sections.push("\n### 반복 조언 테마 → mentorInsights.repeatedAdvice 참고");
    sections.push(
      report.mentorPatterns.adviceThemes
        .map((t) => `- "${t.theme}": ${t.count}회 반복`)
        .join("\n")
    );
  }

  sections.push(`\n### 후속조치 기록율: ${Math.round(report.mentorPatterns.followUpRate * 100)}%`);

  // 3. 전문가 리소스
  if (report.expertAnalysis.total > 0) {
    sections.push("\n### 전문가 리소스 활용 분석");
    sections.push(`- 총 ${report.expertAnalysis.total}건 요청`);
    sections.push(`- 상태: ${report.expertAnalysis.byStatus.map((s) => `${s.status} ${s.count}건`).join(", ")}`);
    if (report.expertAnalysis.pendingUrgent > 0) {
      sections.push(`- ⚠ 긴급 미처리: ${report.expertAnalysis.pendingUrgent}건`);
    }
    if (report.expertAnalysis.demandAreas.length > 0) {
      sections.push(`- 수요 분야: ${report.expertAnalysis.demandAreas.join(", ")}`);
    }
  }

  // 4. KPT 패턴
  if (report.kptPatterns.totalReviews > 0) {
    sections.push(`\n### KPT 분석 (${report.kptPatterns.totalReviews}건)`);
    if (report.kptPatterns.recurringProblems.length > 0) {
      sections.push(`- 반복 Problem 키워드: ${report.kptPatterns.recurringProblems.join(", ")} → repeatPatterns/unspokenSignals 후보`);
    }
  }

  // 5. OKR 분석
  if (report.okrAnalysis.overallRate != null) {
    sections.push(`\n### Objective 달성율: ${report.okrAnalysis.overallRate}%`);
    if (report.okrAnalysis.hasGap) {
      sections.push(`- ⚠ ${report.okrAnalysis.gapDetail}`);
    }
  }

  // 6. 데이터 공백
  if (report.dataGaps.length > 0) {
    sections.push("\n### 데이터 공백 (브리핑 시 명시 필요)");
    sections.push(
      report.dataGaps
        .map((g) => `- [${g.severity}] ${g.area}: ${g.detail}`)
        .join("\n")
    );
  }

  // 7. 활동 타임라인 (최근 6개월만)
  const recentActivity = report.activityTimeline.slice(-6);
  if (recentActivity.length > 0) {
    sections.push("\n### 최근 활동 밀도 (월별)");
    sections.push(
      recentActivity
        .map((a) => `- ${a.month}: 세션 ${a.sessionCount}건, KPT ${a.kptCount}건, 전문가요청 ${a.expertRequestCount}건`)
        .join("\n")
    );
  }

  // 8. 컨텍스트 요약
  sections.push(`\n### Analyst 컨텍스트 요약\n${report.narrativeContext}`);

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
