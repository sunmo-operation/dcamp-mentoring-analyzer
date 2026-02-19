// ══════════════════════════════════════════════════
// Claude AI 응답 검증 스키마 (Zod)
// 프롬프트가 요구하는 형식과 실제 응답의 변동성을 모두 수용
// ══════════════════════════════════════════════════
import { z } from "zod";
import type {
  AnalysisSummary,
  SurfaceIssue,
  RootChallenge,
  RecommendedAction,
  RiskSignal,
  CompanyBriefing,
} from "@/types";

// ── 분석(Analyze) 응답 스키마 ─────────────────────
// Claude가 프롬프트 필드명(keyTopics, statement 등)으로 응답하므로
// 구/신 필드명 모두 허용하고, 변환 함수에서 내부 타입으로 매핑

const analysisSummarySchema = z.object({
  oneLiner: z.string().default(""),
  // 프롬프트: keyTopics, 타입: keywords — 양쪽 모두 허용
  keyTopics: z.array(z.string()).optional(),
  keywords: z.array(z.string()).optional(),
  duration: z.string().optional(),
});

const surfaceIssueSchema = z.object({
  // 프롬프트: statement, 타입: title
  statement: z.string().optional(),
  title: z.string().optional(),
  // 프롬프트: context, 타입: description
  context: z.string().optional(),
  description: z.string().optional(),
});

const rootCauseSchema = z.object({
  title: z.string().default(""),
  description: z.string().default(""),
  severity: z.string().default("medium"),
  category: z.string().default(""),
  // 프롬프트: evidence, 타입: structuralCause
  evidence: z.string().optional(),
  structuralCause: z.string().optional(),
});

const recommendedActionSchema = z.object({
  action: z.string().default(""),
  owner: z.string().default(""),
  priority: z.string().default("medium"),
  timeline: z.string().default(""),
  expectedOutcome: z.string().default(""),
});

const riskSignalSchema = z.object({
  // 프롬프트: signal, 타입: title
  signal: z.string().optional(),
  title: z.string().optional(),
  // 프롬프트: type + severity → 타입: description
  type: z.string().optional(),
  description: z.string().optional(),
  severity: z.string().optional(),
  // 프롬프트: mitigation, 타입: response
  mitigation: z.string().optional(),
  response: z.string().optional(),
  pattern: z.string().optional(),
});

export const analysisResponseSchema = z.object({
  summary: analysisSummarySchema.nullable().optional(),
  surfaceIssues: z.array(surfaceIssueSchema).nullable().optional(),
  rootCauses: z.array(rootCauseSchema).nullable().optional(),
  recommendedActions: z.array(recommendedActionSchema).nullable().optional(),
  riskSignals: z.array(riskSignalSchema).nullable().optional(),
});

export type AnalysisResponse = z.infer<typeof analysisResponseSchema>;

/**
 * 검증된 Claude 응답을 내부 타입 구조로 변환
 */
export function transformAnalysisResponse(parsed: AnalysisResponse): {
  summary: AnalysisSummary | null;
  surfaceIssues: SurfaceIssue[] | null;
  rootChallenges: RootChallenge[] | null;
  recommendedActions: RecommendedAction[] | null;
  riskSignals: RiskSignal[] | null;
} {
  return {
    summary: parsed.summary
      ? {
          oneLiner: parsed.summary.oneLiner,
          keywords: parsed.summary.keyTopics || parsed.summary.keywords || [],
        }
      : null,

    surfaceIssues: parsed.surfaceIssues?.map((s) => ({
      title: s.statement || s.title || "",
      description: s.context || s.description || "",
    })) ?? null,

    rootChallenges: parsed.rootCauses?.map((r) => ({
      title: r.title,
      description: r.description,
      severity: r.severity as "high" | "medium" | "low",
      category: r.category,
      structuralCause: r.evidence || r.structuralCause || "",
    })) ?? null,

    recommendedActions: parsed.recommendedActions?.map((a) => ({
      action: a.action,
      owner: a.owner,
      priority: a.priority as "urgent" | "high" | "medium" | "low",
      timeline: a.timeline,
      expectedOutcome: a.expectedOutcome,
    })) ?? null,

    riskSignals: parsed.riskSignals?.map((r) => ({
      title: r.signal || r.title || "",
      description: r.type
        ? `[${r.type}] ${r.severity || ""}`
        : (r.description || ""),
      pattern: r.pattern,
      response: r.mitigation || r.response || "",
    })) ?? null,
  };
}

// ── 브리핑(Briefing) 응답 스키마 ──────────────────
export const briefingResponseSchema = z.object({
  executiveSummary: z.object({
    oneLiner: z.string().default(""),
    currentPhase: z.string().default(""),
    momentum: z.enum(["positive", "neutral", "negative", "critical"]).default("neutral"),
    momentumReason: z.string().default(""),
    reportBody: z.string().default(""),
  }).nullable().optional(),

  okrDiagnosis: z.object({
    overallRate: z.number().nullable().optional(),
    objectives: z.array(z.object({
      name: z.string().default(""),
      achievementRate: z.number().default(0),
      achieved: z.boolean().default(false),
    })).default([]),
    trendAnalysis: z.string().default(""),
    metricVsNarrative: z.string().nullable().optional(),
  }).nullable().optional(),

  repeatPatterns: z.array(z.object({
    issue: z.string().default(""),
    issueCategory: z.string().default(""),
    firstSeen: z.string().default(""),
    occurrences: z.number().default(1),
    structuralCause: z.string().default(""),
    urgency: z.enum(["high", "medium", "low"]).default("medium"),
  })).default([]),

  unspokenSignals: z.array(z.object({
    signal: z.string().default(""),
    detectedFrom: z.string().default(""),
    hypothesis: z.string().default(""),
    earlyWarning: z.string().default(""),
  })).default([]),

  mentorInsights: z.object({
    repeatedAdvice: z.string().default(""),
    executedAdvice: z.string().default(""),
    ignoredAdvice: z.string().default(""),
    currentExpertRequests: z.string().default(""),
    gapAnalysis: z.string().default(""),
  }).nullable().optional(),

  meetingStrategy: z.object({
    focus: z.string().default(""),
    avoid: z.string().default(""),
    keyQuestions: z.array(z.string()).default([]),
    openingLine: z.string().default(""),
  }).nullable().optional(),

  pmActions: z.array(z.object({
    priority: z.number().default(1),
    action: z.string().default(""),
    deadline: z.string().default(""),
    why: z.string().default(""),
  })).default([]),
});

export type BriefingResponse = z.infer<typeof briefingResponseSchema>;

/**
 * 검증된 브리핑 응답을 CompanyBriefing 필드로 변환
 */
export function transformBriefingResponse(
  parsed: BriefingResponse
): Pick<
  CompanyBriefing,
  | "executiveSummary"
  | "okrDiagnosis"
  | "repeatPatterns"
  | "unspokenSignals"
  | "mentorInsights"
  | "meetingStrategy"
  | "pmActions"
> {
  return {
    executiveSummary: parsed.executiveSummary ?? null,
    okrDiagnosis: parsed.okrDiagnosis
      ? {
          overallRate: parsed.okrDiagnosis.overallRate ?? null,
          objectives: parsed.okrDiagnosis.objectives,
          trendAnalysis: parsed.okrDiagnosis.trendAnalysis,
          metricVsNarrative: parsed.okrDiagnosis.metricVsNarrative ?? null,
        }
      : null,
    repeatPatterns: parsed.repeatPatterns,
    unspokenSignals: parsed.unspokenSignals,
    mentorInsights: parsed.mentorInsights ?? null,
    meetingStrategy: parsed.meetingStrategy ?? null,
    pmActions: parsed.pmActions,
  };
}
