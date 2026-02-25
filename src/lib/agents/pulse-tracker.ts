// ══════════════════════════════════════════════════
// ④ Pulse Tracker Agent
// 시계열 기반 기업 건강도 추적
// - 미팅 주기/밀도 분석
// - 주요 마일스톤 추출
// - 종합 건강 신호
// ══════════════════════════════════════════════════

import type { CompanyDataPacket, PulseReport } from "./types";
import type { MentoringSession, KptReview } from "@/types";

/**
 * CompanyDataPacket → PulseReport 변환
 * AI 호출 없이 데이터만으로 분석 (즉시 반환)
 */
export function generatePulseReport(packet: CompanyDataPacket): PulseReport {
  const cadence = analyzeMeetingCadence(packet.sessions, packet.company.batchStartDate);
  const milestones = extractMilestones(packet);
  const healthSignals = assessHealth(packet, cadence);

  return { meetingCadence: cadence, milestones, healthSignals };
}

// ── 미팅 주기/밀도 분석 ──────────────────────────────

function analyzeMeetingCadence(
  sessions: MentoringSession[],
  batchStartDate?: string
): PulseReport["meetingCadence"] {
  const sorted = [...sessions]
    .filter((s) => s.date)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (sorted.length === 0) {
    return {
      avgIntervalDays: 0,
      recentIntervalDays: 0,
      trend: "irregular",
      trendReason: "미팅 기록 없음",
      totalSessions: 0,
      periodMonths: 0,
      byType: [],
      densityScore: 0,
      densityLabel: "경고",
    };
  }

  // 미팅 간격 계산
  const intervals: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1].date).getTime();
    const curr = new Date(sorted[i].date).getTime();
    const days = Math.round((curr - prev) / (1000 * 60 * 60 * 24));
    if (days >= 0) intervals.push(days);
  }

  const avgInterval = intervals.length > 0
    ? Math.round(intervals.reduce((a, b) => a + b, 0) / intervals.length)
    : 0;

  // 최근 3회 간격
  const recentIntervals = intervals.slice(-3);
  const recentAvg = recentIntervals.length > 0
    ? Math.round(recentIntervals.reduce((a, b) => a + b, 0) / recentIntervals.length)
    : 0;

  // 기간 (월)
  const firstDate = new Date(sorted[0].date);
  const lastDate = new Date(sorted[sorted.length - 1].date);
  const periodMonths = Math.max(
    1,
    Math.round((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24 * 30))
  );

  // 트렌드 판단
  let trend: PulseReport["meetingCadence"]["trend"] = "stable";
  let trendReason = "";

  if (intervals.length >= 3) {
    const firstHalf = intervals.slice(0, Math.floor(intervals.length / 2));
    const secondHalf = intervals.slice(Math.floor(intervals.length / 2));
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    const ratio = secondAvg / firstAvg;

    if (ratio < 0.7) {
      trend = "accelerating";
      trendReason = `미팅 주기가 평균 ${Math.round(firstAvg)}일 → ${Math.round(secondAvg)}일로 빨라지는 중`;
    } else if (ratio > 1.5) {
      trend = "slowing";
      trendReason = `미팅 주기가 평균 ${Math.round(firstAvg)}일 → ${Math.round(secondAvg)}일로 느려지는 중`;
    } else {
      trend = "stable";
      trendReason = `평균 ${avgInterval}일 간격으로 안정적`;
    }

    // 표준편차가 크면 irregular
    const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const variance = intervals.reduce((a, b) => a + (b - mean) ** 2, 0) / intervals.length;
    const stddev = Math.sqrt(variance);
    if (stddev > mean * 0.8) {
      trend = "irregular";
      trendReason = `미팅 간격이 ${Math.min(...intervals)}~${Math.max(...intervals)}일로 불규칙`;
    }
  } else if (intervals.length > 0) {
    trendReason = `미팅 ${sorted.length}회로 추세 판단 어려움`;
  }

  // 유형별 집계
  const typeMap = new Map<string, { count: number; lastDate: string }>();
  for (const s of sorted) {
    const types = s.sessionTypes.length > 0 ? s.sessionTypes : ["기타"];
    for (const t of types) {
      const existing = typeMap.get(t);
      if (!existing || s.date > existing.lastDate) {
        typeMap.set(t, {
          count: (existing?.count || 0) + 1,
          lastDate: s.date,
        });
      } else {
        existing.count++;
      }
    }
  }
  const byType = Array.from(typeMap.entries())
    .map(([type, data]) => ({ type, ...data }))
    .sort((a, b) => b.count - a.count);

  // 밀도 점수 (0~100)
  // 기준: 배치 기간 동안 주 1회 미팅이 100점
  const expectedWeeks = periodMonths * 4.3;
  const densityRatio = sorted.length / Math.max(expectedWeeks, 1);
  const densityScore = Math.min(100, Math.round(densityRatio * 100));

  let densityLabel: string;
  if (densityScore >= 80) densityLabel = "매우 활발";
  else if (densityScore >= 50) densityLabel = "양호";
  else if (densityScore >= 30) densityLabel = "느슨";
  else densityLabel = "경고";

  return {
    avgIntervalDays: avgInterval,
    recentIntervalDays: recentAvg,
    trend,
    trendReason,
    totalSessions: sorted.length,
    periodMonths,
    byType,
    densityScore,
    densityLabel,
  };
}

// ── 주요 마일스톤 추출 ──────────────────────────────

// 세션 요약에서 마일스톤 키워드 감지
const MILESTONE_KEYWORDS: { pattern: RegExp; category: PulseReport["milestones"][0]["category"] }[] = [
  // 성과
  { pattern: /매출|MRR|ARR|GMV|MAU|DAU|전환율|가입자|고객.*확보|계약.*체결|론칭|출시|릴리즈|런칭/i, category: "성과" },
  // 전환점
  { pattern: /피벗|방향.*전환|전략.*변경|BM.*변경|타겟.*변경|리브랜딩/i, category: "전환점" },
  // 의사결정
  { pattern: /투자.*유치|라운드|시리즈|벨류에이션|IR|인수|파트너십|MOU|제휴/i, category: "의사결정" },
  // 리스크
  { pattern: /퇴사|이탈|해고|런웨이|자금.*부족|캐시.*소진|지연|실패/i, category: "리스크" },
  // 외부
  { pattern: /정부.*지원|보조금|인증|특허|수상|데모데이|IR.*행사/i, category: "외부" },
];

function detectMilestoneCategory(text: string): PulseReport["milestones"][0]["category"] | null {
  for (const { pattern, category } of MILESTONE_KEYWORDS) {
    if (pattern.test(text)) return category;
  }
  return null;
}

function extractMilestones(packet: CompanyDataPacket): PulseReport["milestones"] {
  const milestones: PulseReport["milestones"] = [];

  // 1. 세션 요약/후속조치에서 마일스톤 추출
  for (const s of packet.sessions) {
    const texts = [s.summary, s.followUp].filter(Boolean) as string[];
    const combined = texts.join(" ");
    const category = detectMilestoneCategory(combined);
    if (category && s.date) {
      // 매칭된 키워드 주변 문맥 추출 (간결한 제목)
      const title = extractMilestoneTitle(combined, category);
      milestones.push({
        date: s.date,
        title,
        category,
        source: "멘토링",
        detail: s.title,
      });
    }
  }

  // 2. KPT에서 주요 성과(Keep) 추출
  for (const kpt of packet.kptReviews) {
    if (kpt.keep && kpt.reviewDate) {
      const category = detectMilestoneCategory(kpt.keep);
      if (category) {
        milestones.push({
          date: kpt.reviewDate,
          title: truncate(kpt.keep, 60),
          category,
          source: "KPT",
        });
      }
    }
  }

  // 3. 전문가 요청 중 완료된 건
  for (const req of packet.expertRequests) {
    if (req.status === "완료" || req.status === "진행 완료") {
      milestones.push({
        date: req.requestedAt?.split("T")[0] || "",
        title: req.oneLiner || req.title,
        category: "외부",
        source: "전문가요청",
      });
    }
  }

  // 날짜 내림차순 정렬, 중복 제거 (같은 날짜+카테고리)
  const seen = new Set<string>();
  return milestones
    .filter((m) => m.date)
    .sort((a, b) => b.date.localeCompare(a.date))
    .filter((m) => {
      const key = `${m.date}-${m.category}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 15); // 최대 15건
}

function extractMilestoneTitle(text: string, category: string): string {
  // 키워드가 포함된 문장을 추출하여 간결하게
  const sentences = text.split(/[.。\n]/).filter(Boolean);
  for (const { pattern } of MILESTONE_KEYWORDS) {
    const match = sentences.find((s) => pattern.test(s));
    if (match) return truncate(match.trim(), 60);
  }
  return truncate(text, 60);
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 3) + "...";
}

// ── 종합 건강 신호 ──────────────────────────────

function assessHealth(
  packet: CompanyDataPacket,
  cadence: PulseReport["meetingCadence"]
): PulseReport["healthSignals"] {
  const signals: PulseReport["healthSignals"] = [];

  // 1. 미팅 밀도
  if (cadence.densityScore >= 70) {
    signals.push({
      signal: "미팅 밀도",
      status: "good",
      detail: `${cadence.densityLabel} — ${cadence.totalSessions}회/${cadence.periodMonths}개월, 평균 ${cadence.avgIntervalDays}일 간격`,
    });
  } else if (cadence.densityScore >= 40) {
    signals.push({
      signal: "미팅 밀도",
      status: "warning",
      detail: `${cadence.densityLabel} — 평균 ${cadence.avgIntervalDays}일 간격. 주 1회 기준 ${cadence.densityScore}% 수준`,
    });
  } else {
    signals.push({
      signal: "미팅 밀도",
      status: "concern",
      detail: `${cadence.densityLabel} — 평균 ${cadence.avgIntervalDays}일 간격. 미팅 빈도 점검 필요`,
    });
  }

  // 2. 미팅 추세
  if (cadence.trend === "slowing") {
    signals.push({
      signal: "미팅 주기 둔화",
      status: "warning",
      detail: cadence.trendReason,
    });
  } else if (cadence.trend === "accelerating") {
    signals.push({
      signal: "미팅 주기 가속",
      status: "good",
      detail: cadence.trendReason,
    });
  }

  // 3. 최근 미팅 간격 체크
  const sessions = [...packet.sessions].sort((a, b) => b.date.localeCompare(a.date));
  if (sessions.length > 0) {
    const lastSessionDate = new Date(sessions[0].date);
    const daysSinceLast = Math.round(
      (Date.now() - lastSessionDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSinceLast > 30) {
      signals.push({
        signal: "최근 미팅 공백",
        status: "concern",
        detail: `마지막 미팅 후 ${daysSinceLast}일 경과 (${sessions[0].date})`,
      });
    } else if (daysSinceLast > 14) {
      signals.push({
        signal: "미팅 간격",
        status: "warning",
        detail: `마지막 미팅 후 ${daysSinceLast}일 경과`,
      });
    }
  }

  // 4. KPT 회고 실행력
  const recentKpts = packet.kptReviews.filter((k) => {
    if (!k.reviewDate) return false;
    const d = new Date(k.reviewDate);
    return Date.now() - d.getTime() < 90 * 24 * 60 * 60 * 1000;
  });
  if (recentKpts.length > 0) {
    signals.push({
      signal: "KPT 회고",
      status: "good",
      detail: `최근 3개월 ${recentKpts.length}건 실행 중`,
    });
  } else if (packet.kptReviews.length > 0) {
    signals.push({
      signal: "KPT 회고 중단",
      status: "warning",
      detail: "최근 3개월간 회고 없음",
    });
  }

  // 5. 전문가 요청 활용도
  const activeRequests = packet.expertRequests.filter(
    (r) => r.status && !["완료", "진행 완료", "지원불가"].includes(r.status)
  );
  if (activeRequests.length > 0) {
    signals.push({
      signal: "전문가 리소스",
      status: "good",
      detail: `진행 중 ${activeRequests.length}건 — 적극적 리소스 활용`,
    });
  }

  // 6. OKR 달성률
  const achievedItems = packet.okrItems.filter((item) => item.achieved);
  if (packet.okrItems.length > 0) {
    const rate = Math.round((achievedItems.length / packet.okrItems.length) * 100);
    signals.push({
      signal: "OKR 달성",
      status: rate >= 60 ? "good" : rate >= 30 ? "warning" : "concern",
      detail: `${packet.okrItems.length}개 지표 중 ${achievedItems.length}개 달성 (${rate}%)`,
    });
  }

  return signals;
}
