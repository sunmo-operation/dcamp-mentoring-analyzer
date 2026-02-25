// ══════════════════════════════════════════════════
// ② Analyst Agent
// 데이터 기반 구조화된 분석 (AI 호출 없음)
// - OKR 진척 분석
// - 세션 토픽/키워드 분석
// - 멘토 조언 패턴
// - 전문가 리소스 분석
// - KPT 패턴 분석
// - 데이터 품질 평가
// - 활동 강도 타임라인
// ══════════════════════════════════════════════════

import type { CompanyDataPacket, AnalystReport } from "./types";

/**
 * CompanyDataPacket → AnalystReport 변환
 * 순수 데이터 처리 — AI 호출 없이 즉시 반환
 */
export function generateAnalystReport(packet: CompanyDataPacket): AnalystReport {
  const okrAnalysis = analyzeOkr(packet);
  const topicAnalysis = analyzeTopics(packet);
  const mentorPatterns = analyzeMentorPatterns(packet);
  const expertAnalysis = analyzeExpertRequests(packet);
  const kptPatterns = analyzeKpt(packet);
  const dataGaps = assessDataGaps(packet);
  const activityTimeline = buildActivityTimeline(packet);
  const narrativeContext = buildNarrativeContext(packet, okrAnalysis, topicAnalysis, mentorPatterns);

  return {
    okrAnalysis,
    topicAnalysis,
    mentorPatterns,
    expertAnalysis,
    kptPatterns,
    dataGaps,
    activityTimeline,
    narrativeContext,
  };
}

// ── OKR 진척 분석 ──────────────────────────────

function analyzeOkr(packet: CompanyDataPacket): AnalystReport["okrAnalysis"] {
  const { okrItems, okrValues, company } = packet;

  if (okrItems.length === 0) {
    return { overallRate: null, objectives: [], hasGap: false };
  }

  // 각 OKR item에 최신 측정값 매핑
  const valueMap = new Map<string, { currentValue: number; targetValue: string }>();
  for (const v of okrValues) {
    if (v.okrItemId && v.currentValue != null) {
      const existing = valueMap.get(v.okrItemId);
      // 최신 값 유지 (period 기준)
      if (!existing || (v.period && existing.targetValue && v.period > existing.targetValue)) {
        valueMap.set(v.okrItemId, {
          currentValue: v.currentValue,
          targetValue: v.targetValue || "",
        });
      }
    }
  }

  const objectives = okrItems.map((item) => {
    const value = valueMap.get(item.notionPageId);
    const rate = typeof item.achievementRate === "number"
      ? item.achievementRate
      : typeof item.achievementRate === "string"
        ? parseFloat(item.achievementRate) || null
        : null;

    return {
      name: item.name,
      level: item.level,
      achievementRate: rate,
      achieved: item.achieved ?? false,
      hasValues: !!value,
      latestValue: value?.currentValue,
      targetValue: item.targetValue ?? undefined,
    };
  });

  // 전체 달성율 (company에서 가져오거나 objectives 평균)
  const overallRate = company.achievementRate ?? (
    objectives.filter((o) => o.achievementRate != null).length > 0
      ? Math.round(
          objectives
            .filter((o) => o.achievementRate != null)
            .reduce((sum, o) => sum + (o.achievementRate ?? 0), 0) /
          objectives.filter((o) => o.achievementRate != null).length
        )
      : null
  );

  // 달성율 vs 실제 데이터 괴리 체크
  const itemsWithRate = objectives.filter((o) => o.achievementRate != null);
  const itemsWithValues = objectives.filter((o) => o.hasValues);
  const hasGap = itemsWithRate.length > 0 && itemsWithValues.length === 0;
  const gapDetail = hasGap
    ? `달성율이 입력되어 있지만 측정값 데이터가 없음 (${itemsWithRate.length}개 항목)`
    : undefined;

  return { overallRate, objectives, hasGap, gapDetail };
}

// ── 세션 토픽/키워드 분석 ──────────────────────────

// 주요 비즈니스 키워드
const TOPIC_KEYWORDS = [
  "매출", "MRR", "ARR", "GMV", "MAU", "DAU", "전환율", "리텐션", "이탈",
  "고객", "사용자", "유저", "B2B", "B2C",
  "투자", "라운드", "시리즈", "IR", "벨류에이션", "런웨이",
  "채용", "인력", "조직", "퇴사", "CTO", "개발자",
  "제품", "MVP", "PMF", "출시", "론칭", "릴리즈", "피벗",
  "마케팅", "영업", "파트너십", "제휴", "MOU",
  "기술", "AI", "데이터", "인프라", "보안",
  "특허", "IP", "인증", "규제",
  "KPI", "OKR", "목표", "성과", "지표",
  "해외", "글로벌", "진출",
];

function analyzeTopics(packet: CompanyDataPacket): AnalystReport["topicAnalysis"] {
  const sessions = [...packet.sessions].sort((a, b) => b.date.localeCompare(a.date));

  // 키워드 빈도 분석
  const keywordCounts = new Map<string, { count: number; lastSeen: string }>();

  for (const s of sessions) {
    const text = [s.title, s.summary, s.followUp].filter(Boolean).join(" ");
    for (const kw of TOPIC_KEYWORDS) {
      if (text.includes(kw)) {
        const existing = keywordCounts.get(kw);
        if (existing) {
          existing.count++;
        } else {
          keywordCounts.set(kw, { count: 1, lastSeen: s.date });
        }
      }
    }
  }

  const topKeywords = Array.from(keywordCounts.entries())
    .map(([keyword, data]) => ({ keyword, ...data }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // 반복 토픽 (2회 이상 키워드 조합)
  const recurringTopics: AnalystReport["topicAnalysis"]["recurringTopics"] = [];
  for (const kw of topKeywords) {
    if (kw.count >= 2) {
      const sessionIds = sessions
        .filter((s) => {
          const text = [s.title, s.summary, s.followUp].filter(Boolean).join(" ");
          return text.includes(kw.keyword);
        })
        .map((s) => s.date)
        .slice(0, 5);
      recurringTopics.push({ topic: kw.keyword, sessions: sessionIds, frequency: kw.count });
    }
  }

  // 최근 3회 핵심 토픽
  const recentFocus: string[] = [];
  for (const s of sessions.slice(0, 3)) {
    const text = [s.title, s.summary, s.followUp].filter(Boolean).join(" ");
    for (const kw of TOPIC_KEYWORDS) {
      if (text.includes(kw) && !recentFocus.includes(kw)) {
        recentFocus.push(kw);
      }
    }
    if (recentFocus.length >= 5) break;
  }

  return { topKeywords, recurringTopics: recurringTopics.slice(0, 5), recentFocus };
}

// ── 멘토 조언 패턴 ──────────────────────────────

function analyzeMentorPatterns(packet: CompanyDataPacket): AnalystReport["mentorPatterns"] {
  const sessions = packet.sessions;

  // 멘토별 세션 수
  const mentorMap = new Map<string, { count: number; lastDate: string }>();
  for (const s of sessions) {
    const names = s.mentorNames || [];
    for (const name of names) {
      const existing = mentorMap.get(name);
      if (!existing || s.date > existing.lastDate) {
        mentorMap.set(name, { count: (existing?.count || 0) + 1, lastDate: s.date });
      } else {
        existing.count++;
      }
    }
  }
  const mentors = Array.from(mentorMap.entries())
    .map(([name, data]) => ({ name, sessionCount: data.count, lastDate: data.lastDate }))
    .sort((a, b) => b.sessionCount - a.sessionCount);

  // 조언 테마 분석 (followUp에서 키워드 추출)
  const themeCounts = new Map<string, { count: number; examples: string[] }>();
  const ADVICE_KEYWORDS = [
    "고객 인터뷰", "사용자 테스트", "피벗", "집중", "우선순위",
    "채용", "팀빌딩", "IR 자료", "투자", "매출", "마케팅",
    "KPI", "지표", "데이터", "프로세스", "조직",
    "제품", "기술", "영업", "파트너", "해외",
  ];

  for (const s of sessions) {
    if (!s.followUp) continue;
    for (const theme of ADVICE_KEYWORDS) {
      if (s.followUp.includes(theme)) {
        const existing = themeCounts.get(theme);
        if (existing) {
          existing.count++;
          if (existing.examples.length < 2) {
            existing.examples.push(truncate(s.followUp, 80));
          }
        } else {
          themeCounts.set(theme, { count: 1, examples: [truncate(s.followUp, 80)] });
        }
      }
    }
  }

  const adviceThemes = Array.from(themeCounts.entries())
    .map(([theme, data]) => ({ theme, ...data }))
    .filter((t) => t.count >= 2)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // 후속조치 기록 비율
  const sessionsWithFollowUp = sessions.filter((s) => s.followUp && s.followUp.trim().length > 10);
  const followUpRate = sessions.length > 0 ? sessionsWithFollowUp.length / sessions.length : 0;

  return { mentors, adviceThemes, followUpRate: Math.round(followUpRate * 100) / 100 };
}

// ── 전문가 리소스 분석 ──────────────────────────

function analyzeExpertRequests(packet: CompanyDataPacket): AnalystReport["expertAnalysis"] {
  const requests = packet.expertRequests;
  if (requests.length === 0) {
    return { total: 0, byStatus: [], avgResponseDays: null, demandAreas: [], pendingUrgent: 0 };
  }

  // 상태별 집계
  const statusMap = new Map<string, number>();
  for (const r of requests) {
    const status = r.status || "미정";
    statusMap.set(status, (statusMap.get(status) || 0) + 1);
  }
  const byStatus = Array.from(statusMap.entries())
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count);

  // 평균 처리 기간 (완료된 건만)
  const completed = requests.filter((r) => ["완료", "진행 완료"].includes(r.status || ""));
  let avgResponseDays: number | null = null;
  if (completed.length > 0) {
    const durations = completed
      .map((r) => {
        if (!r.requestedAt) return null;
        // 완료일 근사치로 현재 시점 사용 (실제 완료일 필드 없음)
        const start = new Date(r.requestedAt).getTime();
        const now = Date.now();
        return Math.round((now - start) / (1000 * 60 * 60 * 24));
      })
      .filter((d): d is number => d != null);
    if (durations.length > 0) {
      avgResponseDays = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
    }
  }

  // 수요 분야 패턴
  const areas = new Set<string>();
  for (const r of requests) {
    if (r.desiredExpert) areas.add(truncate(r.desiredExpert, 30));
    if (r.supportType) {
      for (const t of r.supportType) areas.add(t);
    }
  }

  // 긴급 미처리 건
  const pendingStatuses = ["접수", "검토 중", "매칭 중"];
  const pendingUrgent = requests.filter(
    (r) => r.urgency === "긴급" && pendingStatuses.includes(r.status || "")
  ).length;

  return {
    total: requests.length,
    byStatus,
    avgResponseDays,
    demandAreas: Array.from(areas).slice(0, 5),
    pendingUrgent,
  };
}

// ── KPT 패턴 분석 ──────────────────────────────

function analyzeKpt(packet: CompanyDataPacket): AnalystReport["kptPatterns"] {
  const reviews = [...packet.kptReviews].sort((a, b) =>
    (b.reviewDate || "").localeCompare(a.reviewDate || "")
  );

  if (reviews.length === 0) {
    return { totalReviews: 0, recentKeep: [], recentProblem: [], recentTry: [], recurringProblems: [] };
  }

  const recent = reviews.slice(0, 3);
  const recentKeep = recent.map((r) => r.keep).filter(Boolean) as string[];
  const recentProblem = recent.map((r) => r.problem).filter(Boolean) as string[];
  const recentTry = recent.map((r) => r.try).filter(Boolean) as string[];

  // Problem 반복 키워드 (2회 이상)
  const problemWords = new Map<string, number>();
  const PROBLEM_KEYWORDS = [
    "일정", "지연", "소통", "커뮤니케이션", "인력", "리소스",
    "품질", "기술", "버그", "우선순위", "집중", "의사결정",
    "고객", "매출", "마케팅", "지표", "데이터",
  ];
  for (const r of reviews) {
    if (!r.problem) continue;
    for (const kw of PROBLEM_KEYWORDS) {
      if (r.problem.includes(kw)) {
        problemWords.set(kw, (problemWords.get(kw) || 0) + 1);
      }
    }
  }
  const recurringProblems = Array.from(problemWords.entries())
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .map(([kw]) => kw);

  return { totalReviews: reviews.length, recentKeep, recentProblem, recentTry, recurringProblems };
}

// ── 데이터 품질/공백 평가 ──────────────────────────

function assessDataGaps(packet: CompanyDataPacket): AnalystReport["dataGaps"] {
  const gaps: AnalystReport["dataGaps"] = [];

  // 멘토링 세션 공백
  if (packet.sessions.length === 0) {
    gaps.push({ area: "멘토링", detail: "멘토링 세션 기록 없음", severity: "high" });
  } else {
    const noSummary = packet.sessions.filter((s) => !s.summary || s.summary.trim().length < 10);
    if (noSummary.length > packet.sessions.length * 0.5) {
      gaps.push({
        area: "멘토링 요약",
        detail: `${noSummary.length}/${packet.sessions.length}건 세션에 요약 미기록`,
        severity: "medium",
      });
    }
  }

  // KPT 없음
  if (packet.kptReviews.length === 0) {
    gaps.push({ area: "KPT 회고", detail: "KPT 회고 기록 없음", severity: "medium" });
  }

  // OKR 없음
  if (packet.okrItems.length === 0) {
    gaps.push({ area: "OKR", detail: "OKR/성과지표 미설정", severity: "medium" });
  } else if (packet.okrValues.length === 0) {
    gaps.push({ area: "OKR 측정값", detail: "성과지표는 있으나 측정값 미입력", severity: "medium" });
  }

  // 전문가 요청 없음 (참고용)
  if (packet.expertRequests.length === 0) {
    gaps.push({ area: "전문가 요청", detail: "전문가 리소스 요청 기록 없음", severity: "low" });
  }

  // 기업 기본 정보 공백
  const { company } = packet;
  if (!company.description && !company.productIntro) {
    gaps.push({ area: "기업 소개", detail: "기업 소개/제품 설명 미기록", severity: "low" });
  }

  return gaps;
}

// ── 활동 강도 타임라인 (월별) ──────────────────────

function buildActivityTimeline(packet: CompanyDataPacket): AnalystReport["activityTimeline"] {
  const monthMap = new Map<string, { sessionCount: number; kptCount: number; expertRequestCount: number }>();

  const addMonth = (dateStr: string | undefined, field: "sessionCount" | "kptCount" | "expertRequestCount") => {
    if (!dateStr) return;
    const month = dateStr.slice(0, 7); // "2025-01"
    if (!month || month.length < 7) return;
    const existing = monthMap.get(month) || { sessionCount: 0, kptCount: 0, expertRequestCount: 0 };
    existing[field]++;
    monthMap.set(month, existing);
  };

  for (const s of packet.sessions) addMonth(s.date, "sessionCount");
  for (const k of packet.kptReviews) addMonth(k.reviewDate, "kptCount");
  for (const r of packet.expertRequests) addMonth(r.requestedAt?.split("T")[0], "expertRequestCount");

  return Array.from(monthMap.entries())
    .map(([month, data]) => ({ month, ...data }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

// ── Narrator용 컨텍스트 요약 생성 ──────────────────

function buildNarrativeContext(
  packet: CompanyDataPacket,
  okr: AnalystReport["okrAnalysis"],
  topics: AnalystReport["topicAnalysis"],
  mentors: AnalystReport["mentorPatterns"]
): string {
  const lines: string[] = [];
  const { company } = packet;

  // 기업 기본
  lines.push(`[기업] ${company.name} (${company.batchLabel || ""} ${company.batchName || ""})`);
  if (company.description) lines.push(`소개: ${truncate(company.description, 100)}`);

  // 데이터 규모
  lines.push(
    `[데이터] 세션 ${packet.sessions.length}건, KPT ${packet.kptReviews.length}건, ` +
    `OKR ${packet.okrItems.length}건, 전문가요청 ${packet.expertRequests.length}건`
  );

  // OKR 요약
  if (okr.overallRate != null) {
    lines.push(`[OKR] 전체 달성율 ${okr.overallRate}%`);
    if (okr.hasGap) lines.push(`  ⚠ ${okr.gapDetail}`);
  }

  // 토픽 요약
  if (topics.topKeywords.length > 0) {
    lines.push(`[주요 토픽] ${topics.topKeywords.slice(0, 5).map((k) => `${k.keyword}(${k.count}회)`).join(", ")}`);
  }
  if (topics.recentFocus.length > 0) {
    lines.push(`[최근 포커스] ${topics.recentFocus.join(", ")}`);
  }

  // 멘토 패턴
  if (mentors.mentors.length > 0) {
    lines.push(`[멘토] ${mentors.mentors.slice(0, 3).map((m) => `${m.name}(${m.sessionCount}회)`).join(", ")}`);
  }
  lines.push(`[후속조치율] ${Math.round(mentors.followUpRate * 100)}%`);

  // 조언 반복 테마
  if (mentors.adviceThemes.length > 0) {
    lines.push(`[반복 조언] ${mentors.adviceThemes.map((t) => `${t.theme}(${t.count}회)`).join(", ")}`);
  }

  return lines.join("\n");
}

// ── 유틸 ──────────────────────────────

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 3) + "...";
}
