// ══════════════════════════════════════════════════
// Claude AI 응답 검증 스키마 (Zod)
// 프롬프트가 요구하는 형식과 실제 응답의 변동성을 모두 수용
// ══════════════════════════════════════════════════
import { z } from "zod";

// ── 배열 강제 변환 전처리기 ──────────────────────────
// Claude가 배열 대신 문자열을 반환하는 경우를 방어
// (에러: "expected array, received string" 원천 차단)

/**
 * 문자열 배열용 전처리: 문자열을 줄바꿈/쉼표/번호매기기로 분할
 * 예: "질문1\n질문2" → ["질문1", "질문2"]
 */
function coerceToStringArray(val: unknown): unknown {
  if (Array.isArray(val)) return val;
  if (val === null || val === undefined) return undefined;
  if (typeof val === "string") {
    if (!val.trim()) return [];
    // JSON 배열 파싱 시도
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed;
    } catch { /* 계속 진행 */ }
    // 줄바꿈 / 번호매기기(1. 2.) / 쉼표로 분할
    const lines = val
      .split(/\n|\d+\.\s+/)
      .map((s) => s.replace(/^[-•▪▸*,]\s*/, "").trim())
      .filter(Boolean);
    return lines.length > 0 ? lines : [val];
  }
  return undefined;
}

/**
 * 객체 배열용 전처리: 문자열이면 JSON 파싱 시도, 실패 시 빈 배열
 * 예: "[{...}]" → [{...}] / "텍스트" → []
 */
function coerceToObjectArray(val: unknown): unknown {
  if (Array.isArray(val)) return val;
  if (val === null || val === undefined) return undefined;
  if (typeof val === "string") {
    if (!val.trim()) return [];
    // JSON 파싱 시도
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed;
      if (typeof parsed === "object" && parsed !== null) return [parsed];
    } catch { /* 계속 진행 */ }
    // 객체 배열은 텍스트에서 복구 불가 → 빈 배열
    return [];
  }
  return undefined;
}

/**
 * Claude 응답의 null 값을 undefined로 변환 (재귀)
 * Zod의 .default()는 undefined만 처리하므로, null → undefined 전처리 필요
 */
export function nullsToUndefined(data: unknown): unknown {
  if (data === null) return undefined;
  if (Array.isArray(data)) return data.map(nullsToUndefined);
  if (typeof data === "object") {
    return Object.fromEntries(
      Object.entries(data as Record<string, unknown>).map(([k, v]) => [
        k,
        nullsToUndefined(v),
      ])
    );
  }
  return data;
}
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
  keyTopics: z.preprocess(coerceToStringArray, z.array(z.string())).optional(),
  keywords: z.preprocess(coerceToStringArray, z.array(z.string())).optional(),
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
  surfaceIssues: z.preprocess(coerceToObjectArray, z.array(surfaceIssueSchema)).nullable().optional(),
  rootCauses: z.preprocess(coerceToObjectArray, z.array(rootCauseSchema)).nullable().optional(),
  recommendedActions: z.preprocess(coerceToObjectArray, z.array(recommendedActionSchema)).nullable().optional(),
  riskSignals: z.preprocess(coerceToObjectArray, z.array(riskSignalSchema)).nullable().optional(),
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
    pmfStage: z.string().optional(),
    vocStrength: z.string().optional(),
  }).nullable().optional(),

  okrDiagnosis: z.object({
    overallRate: z.number().nullable().optional(),
    objectives: z.preprocess(coerceToObjectArray, z.array(z.object({
      name: z.string().default(""),
      achievementRate: z.number().default(0),
      achieved: z.boolean().default(false),
    })).default([])),
    trendAnalysis: z.string().default(""),
    metricVsNarrative: z.string().nullable().optional(),
    kptHighlights: z.object({
      keep: z.string().default(""),
      problem: z.string().default(""),
      try: z.string().default(""),
    }).nullable().optional(),
  }).nullable().optional(),

  positiveShifts: z.preprocess(coerceToObjectArray, z.array(z.object({
    shift: z.string().default(""),
    evidence: z.string().default(""),
    detectedFrom: z.string().default(""),
    impactArea: z.string().default(""),
  })).default([])),

  repeatPatterns: z.preprocess(coerceToObjectArray, z.array(z.object({
    issue: z.string().default(""),
    // 9개 카테고리 + 이전 호환용 (조직, 실행, 시장)
    issueCategory: z.string().default("운영"),
    firstSeen: z.string().default(""),
    occurrences: z.number().default(1),
    structuralCause: z.string().default(""),
    urgency: z.enum(["high", "medium", "low"]).default("medium"),
  })).default([])),

  unspokenSignals: z.preprocess(coerceToObjectArray, z.array(z.object({
    signal: z.string().default(""),
    detectedFrom: z.string().default(""),
    hypothesis: z.string().default(""),
    earlyWarning: z.string().default(""),
  })).default([])),

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
    keyQuestions: z.preprocess(coerceToStringArray, z.array(z.string()).default([])),
    openingLine: z.string().default(""),
  }).nullable().optional(),

  pmActions: z.preprocess(coerceToObjectArray, z.array(z.object({
    priority: z.number().default(1),
    action: z.string().default(""),
    deadline: z.string().default(""),
    why: z.string().default(""),
  })).default([])),

  // 업계 동향 / 경쟁서비스 / 법령·정책
  industryContext: z.object({
    competitors: z.preprocess(coerceToObjectArray, z.array(z.object({
      name: z.string().default(""),
      description: z.string().default(""),
      stage: z.string().default(""),
      similarity: z.string().default(""),
      // 이전: differentiation → 현재: implications (호환 위해 둘 다 허용)
      implications: z.string().optional(),
      differentiation: z.string().optional(),
      recentMove: z.string().default(""),
      threatLevel: z.enum(["high", "medium", "low"]).default("medium"),
    })).default([])),
    industryTrends: z.preprocess(coerceToObjectArray, z.array(z.object({
      trend: z.string().default(""),
      impact: z.string().default(""),
      source: z.string().default(""),
      url: z.string().optional(),
    })).default([])),
    regulatoryAndPolicy: z.preprocess(coerceToObjectArray, z.array(z.object({
      title: z.string().default(""),
      type: z.string().default("업계소식"),
      impact: z.string().default(""),
      actionRequired: z.string().default(""),
      url: z.string().optional(),
    })).default([])),
    marketInsight: z.string().default(""),
  }).nullable().optional(),
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
  | "positiveShifts"
  | "repeatPatterns"
  | "unspokenSignals"
  | "mentorInsights"
  | "meetingStrategy"
  | "pmActions"
  | "industryContext"
> {
  return {
    executiveSummary: parsed.executiveSummary ?? null,
    okrDiagnosis: parsed.okrDiagnosis
      ? {
          overallRate: parsed.okrDiagnosis.overallRate ?? null,
          objectives: parsed.okrDiagnosis.objectives,
          trendAnalysis: parsed.okrDiagnosis.trendAnalysis,
          metricVsNarrative: parsed.okrDiagnosis.metricVsNarrative ?? null,
          kptHighlights: parsed.okrDiagnosis.kptHighlights ?? null,
        }
      : null,
    positiveShifts: parsed.positiveShifts,
    repeatPatterns: parsed.repeatPatterns,
    unspokenSignals: parsed.unspokenSignals,
    mentorInsights: parsed.mentorInsights ?? null,
    meetingStrategy: parsed.meetingStrategy ?? null,
    pmActions: parsed.pmActions,
    industryContext: parsed.industryContext
      ? {
          ...parsed.industryContext,
          // implications / differentiation 호환: 새 필드명으로 통일
          competitors: parsed.industryContext.competitors.map((c) => ({
            name: c.name,
            description: c.description,
            stage: c.stage,
            similarity: c.similarity,
            implications: c.implications || c.differentiation || "",
            recentMove: c.recentMove,
            threatLevel: c.threatLevel,
          })),
        }
      : null,
  };
}
