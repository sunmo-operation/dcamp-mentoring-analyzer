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
  const engagement = assessProgramEngagement(packet);
  const healthSignals = assessHealth(packet, cadence, engagement);
  const qualitativeAssessment = buildQualitativeAssessment(packet, cadence);
  const summary = buildNarrativeSummary(qualitativeAssessment, cadence);

  return { meetingCadence: cadence, milestones, programEngagement: engagement, healthSignals, qualitativeAssessment, summary };
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
  const entries: PulseReport["milestones"] = [];
  const companyName = packet.company.name;

  // 1. 모든 노션 멘토링 세션 → 타임라인 항목
  for (const s of packet.sessions) {
    if (!s.date) continue;
    const types = s.sessionTypes.length > 0 ? s.sessionTypes : ["기타"];

    // 세션 유형 → 카테고리 매핑
    let category: PulseReport["milestones"][0]["category"] = "멘토링";
    if (types.some((t) => ["점검", "체크업"].includes(t))) category = "점검";
    else if (types.some((t) => t === "전문가투입")) category = "전문가투입";

    // 키워드 마일스톤 감지 → 하이라이트
    const combined = [s.summary, s.followUp].filter(Boolean).join(" ");
    const milestoneCategory = detectMilestoneCategory(combined);

    // 제목: 배치/기업명 접두사 제거 + 멘토 이름 포함
    const mentors = s.mentorNames?.filter(Boolean).join(", ");
    const title = cleanTitle(s.title || types.join("/") + " 세션", companyName, types, mentors);

    // 요약: 원문에서 핵심 한 줄 추출 (노션 raw 텍스트 → 깔끔한 한 줄)
    const summary = distillOneLiner(s.summary, 100);
    const followUp = distillOneLiner(s.followUp, 80, "→ ");

    entries.push({
      date: s.date,
      title,
      category: milestoneCategory || category,
      source: "노션",
      summary: [summary, followUp].filter(Boolean).join("\n") || undefined,
      detail: milestoneCategory ? extractMilestoneTitle(combined, milestoneCategory) : undefined,
      isHighlight: !!milestoneCategory,
    });
  }

  // 2. KPT 주요 성과 (키워드 매칭만)
  for (const kpt of packet.kptReviews) {
    if (kpt.keep && kpt.reviewDate) {
      const cat = detectMilestoneCategory(kpt.keep);
      if (cat) {
        entries.push({
          date: kpt.reviewDate,
          title: truncate(kpt.keep, 60),
          category: cat,
          source: "KPT",
          isHighlight: true,
        });
      }
    }
  }

  // 3. 전문가 요청
  for (const req of packet.expertRequests) {
    if (!req.requestedAt) continue;
    entries.push({
      date: req.requestedAt.split("T")[0],
      title: truncate(req.oneLiner || req.title, 60),
      category: "전문가요청",
      source: "전문가요청",
      summary: distillOneLiner(req.problem, 100) || undefined,
      isHighlight: req.status === "완료" || req.status === "진행 완료",
    });
  }

  // 4. 코칭 기록 (노션에 없는 날짜만 추가)
  if (packet.coachingRecords) {
    const notionDates = new Set(packet.sessions.map((s) => s.date));

    // 코칭 세션 (최근 10건)
    const coachingSessions = [...packet.coachingRecords.sessions]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 10);
    for (const cs of coachingSessions) {
      if (notionDates.has(cs.date)) continue;
      entries.push({
        date: cs.date,
        title: `${cs.mentor} 멘토링`,
        category: "코칭",
        source: "코칭기록",
        summary: [
          distillOneLiner(cs.issues, 100),
          distillOneLiner(cs.followUp, 80, "→ "),
        ].filter(Boolean).join("\n") || undefined,
      });
    }

    // 전문가 투입 (날짜별 그룹, 최근 10일)
    const deployByDate = new Map<string, string[]>();
    for (const d of packet.coachingRecords.expertDeployments) {
      if (notionDates.has(d.date)) continue;
      const experts = deployByDate.get(d.date) || [];
      if (!experts.includes(d.expert)) experts.push(d.expert);
      deployByDate.set(d.date, experts);
    }
    const deployDates = [...deployByDate.entries()]
      .sort(([a], [b]) => b.localeCompare(a))
      .slice(0, 10);
    for (const [date, experts] of deployDates) {
      entries.push({
        date,
        title: experts.join(", "),
        category: "전문가투입",
        source: "코칭기록",
      });
    }
  }

  // 날짜 내림차순 정렬, 중복 제거
  const seen = new Set<string>();
  return entries
    .filter((m) => m.date && m.date.length >= 8)
    .sort((a, b) => b.date.localeCompare(a.date))
    .filter((m) => {
      const key = `${m.date}-${m.source}-${m.title.slice(0, 15)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

// ── 타임라인 텍스트 정제 유틸 ──────────────────────

/**
 * 노션 제목에서 배치/기업명 접두사 제거 + 멘토 이름 포함
 * "3기_넥스트그라운드_멘토 미팅" → "멘토 미팅 (댄박)"
 * "3기_넥스트그라운드_넥스트그라운드" → "멘토링 (댄박)"
 */
function cleanTitle(rawTitle: string, companyName: string, sessionTypes: string[], mentors?: string): string {
  let cleaned = rawTitle;

  // "N기_" 접두사 제거
  cleaned = cleaned.replace(/^\d+기_/, "");

  // 기업명 접두사 제거 ("넥스트그라운드_" 또는 "넥스트그라운드 ")
  if (companyName) {
    const escaped = companyName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    cleaned = cleaned.replace(new RegExp(`^${escaped}[_\\s]*`, "i"), "");
  }

  // 남은 언더스코어 → 공백
  cleaned = cleaned.replace(/_/g, " ").trim();

  // 제거 후 빈 문자열이면 세션 유형으로 대체
  if (!cleaned || cleaned.length <= 2) {
    const typeLabel = sessionTypes.length > 0 ? sessionTypes.join("/") : "멘토링";
    cleaned = mentors ? `${typeLabel} (${mentors})` : `${typeLabel} 세션`;
    return cleaned;
  }

  // 멘토 이름 추가 (이미 포함되어 있지 않은 경우)
  if (mentors && !cleaned.includes(mentors.split(",")[0].trim())) {
    cleaned = `${cleaned} (${mentors})`;
  }

  return cleaned;
}

/**
 * 노션 원문 → 핵심 한 줄 추출
 * 불릿/번호/헤더 마커 제거 후 첫 번째 의미있는 문장을 반환
 */
function distillOneLiner(rawText: string | undefined | null, maxLen: number, prefix = ""): string {
  if (!rawText) return "";

  const lines = rawText
    .split(/\n/)
    .map((l) =>
      l
        .replace(/^\s*[-•◦·*]\s*/, "")         // 불릿 마커 제거
        .replace(/^\s*\d+\.\s*/, "")            // 번호 리스트 제거
        .replace(/^\[.*?\]\s*/, "")             // [헤더] 제거
        .replace(/^(주요|후속|논의|목적|현재|배경|목표)[^\s]*\s*/i, "")  // 섹션 헤더
        .trim()
    )
    .filter((l) => l.length > 8 && !l.startsWith("[") && !l.startsWith("→"));

  if (lines.length === 0) return "";

  // 첫 줄 사용, 두 번째 줄도 여유가 있으면 합침
  let result = lines[0];
  if (lines.length > 1 && result.length + lines[1].length + 2 <= maxLen) {
    result += ". " + lines[1];
  }

  return prefix + truncate(result, maxLen - prefix.length);
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

// ── 디캠프 프로그램 참여도 분석 ──────────────────────

function assessProgramEngagement(
  packet: CompanyDataPacket
): PulseReport["programEngagement"] {
  // 기본 가중치 (데이터가 있는 영역만 사용하여 재분배)
  const BASE_WEIGHTS: { area: string; weight: number }[] = [
    { area: "멘토링", weight: 0.30 },
    { area: "전문가 투입", weight: 0.20 },
    { area: "KPT 회고", weight: 0.20 },
    { area: "OKR 관리", weight: 0.15 },
    { area: "전문가 요청", weight: 0.15 },
  ];

  // 각 영역 점수 + 데이터 존재 여부 평가
  const raw: { area: string; score: number; detail: string; hasData: boolean; baseWeight: number }[] = [];

  // 1. 멘토링 참여 (멘토/점검/체크업 세션)
  const mentorSessions = packet.sessions.filter((s) =>
    s.sessionTypes.some((t) => ["멘토", "점검", "체크업"].includes(t))
  );
  const hasMentoringData = packet.sessions.length > 0;
  const recentMentorSessions = mentorSessions.filter((s) => isWithinMonths(s.date, 3));
  const mentorScore = hasMentoringData ? Math.min(100, recentMentorSessions.length * 25) : 0;
  raw.push({
    area: "멘토링",
    score: mentorScore,
    detail: hasMentoringData
      ? recentMentorSessions.length > 0
        ? `최근 3개월 ${recentMentorSessions.length}회 참여`
        : "최근 3개월 참여 없음"
      : "데이터 없음",
    hasData: hasMentoringData,
    baseWeight: BASE_WEIGHTS[0].weight,
  });

  // 2. 전문가 투입 활용
  const expertSessions = packet.sessions.filter((s) =>
    s.sessionTypes.some((t) => t === "전문가투입")
  );
  const hasExpertData = expertSessions.length > 0;
  const expertScore = hasExpertData ? Math.min(100, expertSessions.length * 50) : 0;
  raw.push({
    area: "전문가 투입",
    score: expertScore,
    detail: hasExpertData
      ? `총 ${expertSessions.length}회 전문가 투입 세션`
      : "데이터 없음",
    hasData: hasExpertData,
    baseWeight: BASE_WEIGHTS[1].weight,
  });

  // 3. KPT 회고 실행
  const hasKptData = packet.kptReviews.length > 0;
  const recentKpts = packet.kptReviews.filter((k) => isWithinMonths(k.reviewDate, 3));
  const kptScore = hasKptData ? Math.min(100, recentKpts.length * 33) : 0;
  raw.push({
    area: "KPT 회고",
    score: kptScore,
    detail: hasKptData
      ? recentKpts.length > 0
        ? `최근 3개월 ${recentKpts.length}건 회고 실행`
        : "최근 회고 중단됨"
      : "데이터 없음",
    hasData: hasKptData,
    baseWeight: BASE_WEIGHTS[2].weight,
  });

  // 4. OKR 관리
  const hasOkrData = packet.okrItems.length > 0;
  const hasValues = packet.okrValues.length > 0;
  const okrScore = hasOkrData ? (hasValues ? 100 : 50) : 0;
  raw.push({
    area: "OKR 관리",
    score: okrScore,
    detail: hasOkrData
      ? `${packet.okrItems.length}개 지표${hasValues ? `, ${packet.okrValues.length}건 측정값 입력` : " (측정값 미입력)"}`
      : "데이터 없음",
    hasData: hasOkrData,
    baseWeight: BASE_WEIGHTS[3].weight,
  });

  // 5. 전문가 요청 제출
  const hasReqData = packet.expertRequests.length > 0;
  const reqScore = hasReqData ? Math.min(100, packet.expertRequests.length * 50) : 0;
  raw.push({
    area: "전문가 요청",
    score: reqScore,
    detail: hasReqData
      ? `총 ${packet.expertRequests.length}건 요청 (완료 ${packet.expertRequests.filter((r) => ["완료", "진행 완료"].includes(r.status || "")).length}건)`
      : "데이터 없음",
    hasData: hasReqData,
    baseWeight: BASE_WEIGHTS[4].weight,
  });

  // 종합 점수: 데이터가 있는 영역만으로 가중 평균 (가중치 재분배)
  const activeItems = raw.filter((r) => r.hasData);
  const totalActiveWeight = activeItems.reduce((sum, r) => sum + r.baseWeight, 0);

  const breakdown: PulseReport["programEngagement"]["breakdown"] = raw.map((r) => ({
    area: r.area,
    score: r.score,
    detail: r.detail,
    hasData: r.hasData,
    // 데이터가 있는 영역에만 가중치 재분배
    weight: r.hasData && totalActiveWeight > 0
      ? Math.round((r.baseWeight / totalActiveWeight) * 100) / 100
      : 0,
  }));

  const overallScore = totalActiveWeight > 0
    ? Math.round(
        activeItems.reduce((sum, r) => {
          const redistributedWeight = r.baseWeight / totalActiveWeight;
          return sum + r.score * redistributedWeight;
        }, 0)
      )
    : 0;

  let label: string;
  if (totalActiveWeight === 0) label = "평가 불가";
  else if (overallScore >= 70) label = "적극 활용";
  else if (overallScore >= 40) label = "보통";
  else if (overallScore > 0) label = "저조";
  else label = "미참여";

  return { overallScore, label, breakdown };
}

function isWithinMonths(dateStr: string | undefined, months: number): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - months);
  return d.getTime() >= cutoff.getTime();
}

// ── 종합 건강 신호 ──────────────────────────────

function assessHealth(
  packet: CompanyDataPacket,
  cadence: PulseReport["meetingCadence"],
  engagement: PulseReport["programEngagement"]
): PulseReport["healthSignals"] {
  const signals: PulseReport["healthSignals"] = [];

  // 1. 디캠프 참여도 종합 (데이터가 있는 영역만 기준)
  const activeAreas = engagement.breakdown.filter((b) => b.hasData);
  const activeHighAreas = activeAreas.filter((b) => b.score >= 50).map((b) => b.area);
  signals.push({
    signal: "디캠프 프로그램 참여도",
    status: engagement.overallScore >= 60 ? "good" : engagement.overallScore >= 30 ? "warning" : "concern",
    detail: `${engagement.label} (${engagement.overallScore}점) — ${activeHighAreas.join(", ") || "활성 영역 없음"}`,
  });

  // 2. 미팅 밀도
  signals.push({
    signal: "미팅 밀도",
    status: cadence.densityScore >= 70 ? "good" : cadence.densityScore >= 40 ? "warning" : "concern",
    detail: `${cadence.densityLabel} — ${cadence.totalSessions}회/${cadence.periodMonths}개월, 평균 ${cadence.avgIntervalDays}일 간격`,
  });

  // 3. 미팅 추세
  if (cadence.trend === "slowing") {
    signals.push({ signal: "미팅 주기 둔화", status: "warning", detail: cadence.trendReason });
  } else if (cadence.trend === "accelerating") {
    signals.push({ signal: "미팅 주기 가속", status: "good", detail: cadence.trendReason });
  }

  // 4. 최근 미팅 공백
  const sessions = [...packet.sessions].sort((a, b) => b.date.localeCompare(a.date));
  if (sessions.length > 0) {
    const daysSinceLast = Math.round(
      (Date.now() - new Date(sessions[0].date).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSinceLast > 30) {
      signals.push({ signal: "최근 미팅 공백", status: "concern", detail: `마지막 미팅 후 ${daysSinceLast}일 경과` });
    } else if (daysSinceLast > 14) {
      signals.push({ signal: "미팅 간격", status: "warning", detail: `마지막 미팅 후 ${daysSinceLast}일 경과` });
    }
  }

  // 5. 참여도 저조 항목 경고 (데이터가 있는데 점수가 0인 경우만)
  for (const b of engagement.breakdown) {
    if (b.hasData && b.score === 0) {
      signals.push({ signal: `${b.area} 미활용`, status: "concern", detail: b.detail });
    }
  }

  return signals;
}

// ── 정성적 종합 평가 ──────────────────────────────

function buildQualitativeAssessment(
  packet: CompanyDataPacket,
  cadence: PulseReport["meetingCadence"]
): PulseReport["qualitativeAssessment"] {
  const mentoringRegularity = assessMentoringRegularity(packet.sessions);
  const dedicatedMentorEngagement = assessDedicatedMentor(packet);
  const expertRequestActivity = assessExpertRequestActivity(packet);
  const overallNarrative = buildOverallNarrative(
    mentoringRegularity, dedicatedMentorEngagement, expertRequestActivity, cadence
  );

  return { mentoringRegularity, dedicatedMentorEngagement, expertRequestActivity, overallNarrative };
}

/**
 * 월 1회 이상 멘토링 진행 여부 체크
 */
function assessMentoringRegularity(
  sessions: MentoringSession[]
): PulseReport["qualitativeAssessment"]["mentoringRegularity"] {
  // 최근 3개월 월별 세션 수 계산
  const now = new Date();
  const recentMonths: { month: string; count: number }[] = [];
  for (let i = 0; i < 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const count = sessions.filter((s) => s.date && s.date.startsWith(monthStr)).length;
    recentMonths.push({ month: monthStr, count });
  }

  const monthsWithMeeting = recentMonths.filter((m) => m.count > 0).length;
  const meetsMonthlyTarget = monthsWithMeeting >= 2; // 최근 3개월 중 2개월 이상

  let assessment: string;
  if (monthsWithMeeting === 3) {
    assessment = "최근 3개월 매월 멘토링이 진행되고 있어 안정적인 흐름을 유지하고 있음";
  } else if (monthsWithMeeting === 2) {
    const missingMonth = recentMonths.find((m) => m.count === 0);
    assessment = `대체로 월 1회 이상 진행 중이나, ${missingMonth?.month || "일부"} 미팅 공백이 있음`;
  } else if (monthsWithMeeting === 1) {
    assessment = "최근 3개월 중 1개월만 멘토링이 진행되어 주기적 관리가 필요함";
  } else {
    assessment = "최근 3개월간 멘토링 기록이 없어 즉시 점검이 필요함";
  }

  return { meetsMonthlyTarget, recentMonthBreakdown: recentMonths, assessment };
}

/**
 * 전담멘토와 정기적 만남 여부 체크
 */
function assessDedicatedMentor(
  packet: CompanyDataPacket
): PulseReport["qualitativeAssessment"]["dedicatedMentorEngagement"] {
  const mentorName = packet.company.excel?.dedicatedMentor || null;
  const hasDedicatedMentor = !!mentorName && mentorName !== "없음";

  if (!hasDedicatedMentor) {
    return {
      hasDedicatedMentor: false,
      mentorName: null,
      totalMeetings: 0,
      lastMeetingDate: null,
      isRegular: false,
      avgIntervalDays: null,
      assessment: "전담멘토가 배정되지 않은 상태",
    };
  }

  // 전담멘토 이름으로 세션 필터 (쉼표로 구분된 복수 멘토 처리)
  const mentorNames = mentorName.split(/[,，]/).map((n) => n.trim()).filter(Boolean);
  const mentorSessions = packet.sessions
    .filter((s) => s.mentorNames?.some((mn) => mentorNames.some((dn) => mn.includes(dn))))
    .sort((a, b) => a.date.localeCompare(b.date));

  const totalMeetings = mentorSessions.length;
  const lastMeetingDate = mentorSessions.length > 0
    ? mentorSessions[mentorSessions.length - 1].date
    : null;

  // 평균 간격 계산
  let avgIntervalDays: number | null = null;
  if (mentorSessions.length >= 2) {
    const intervals: number[] = [];
    for (let i = 1; i < mentorSessions.length; i++) {
      const prev = new Date(mentorSessions[i - 1].date).getTime();
      const curr = new Date(mentorSessions[i].date).getTime();
      intervals.push(Math.round((curr - prev) / (1000 * 60 * 60 * 24)));
    }
    avgIntervalDays = Math.round(intervals.reduce((a, b) => a + b, 0) / intervals.length);
  }

  // 정기성 판단: 평균 간격 45일 이내면 정기적
  const isRegular = avgIntervalDays !== null && avgIntervalDays <= 45;

  // 마지막 미팅으로부터의 경과일
  const daysSinceLast = lastMeetingDate
    ? Math.round((Date.now() - new Date(lastMeetingDate).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  let assessment: string;
  if (totalMeetings === 0) {
    assessment = `전담멘토(${mentorName})가 배정되어 있으나 멘토링 기록이 없음. 미팅 셋업 필요`;
  } else if (isRegular && daysSinceLast !== null && daysSinceLast <= 45) {
    assessment = `전담멘토(${mentorName})와 평균 ${avgIntervalDays}일 간격으로 정기적 만남 유지 중 (총 ${totalMeetings}회)`;
  } else if (isRegular && daysSinceLast !== null && daysSinceLast > 45) {
    assessment = `전담멘토(${mentorName})와 기존 정기 미팅(평균 ${avgIntervalDays}일 간격)이 있었으나, 최근 ${daysSinceLast}일 동안 공백 발생`;
  } else if (totalMeetings >= 2) {
    assessment = `전담멘토(${mentorName})와 총 ${totalMeetings}회 만남이 있으나 간격이 불규칙(평균 ${avgIntervalDays ?? "?"}일). 정기 일정 수립 권장`;
  } else {
    assessment = `전담멘토(${mentorName})와 ${totalMeetings}회 만남. 추가 미팅으로 관계 구축 필요`;
  }

  return { hasDedicatedMentor, mentorName, totalMeetings, lastMeetingDate, isRegular, avgIntervalDays, assessment };
}

/**
 * 전문가 요청 활용도 평가
 */
function assessExpertRequestActivity(
  packet: CompanyDataPacket
): PulseReport["qualitativeAssessment"]["expertRequestActivity"] {
  const totalRequests = packet.expertRequests.length;
  const completedRequests = packet.expertRequests.filter(
    (r) => ["완료", "진행 완료"].includes(r.status || "")
  ).length;

  let assessment: string;
  if (totalRequests === 0) {
    assessment = "전문가 요청을 아직 활용하지 않고 있음. 디캠프 전문가 리소스 활용을 안내할 필요가 있음";
  } else if (totalRequests >= 3) {
    assessment = `총 ${totalRequests}건 요청(완료 ${completedRequests}건)으로 전문가 리소스를 적극 활용하고 있음`;
  } else if (totalRequests >= 1) {
    assessment = `총 ${totalRequests}건 요청(완료 ${completedRequests}건). 필요에 따라 전문가 리소스를 활용하고 있으나, 추가 활용 여지 있음`;
  } else {
    assessment = "전문가 요청 활용 내역 확인 필요";
  }

  return { totalRequests, completedRequests, assessment };
}

/**
 * 종합 서술 평가 생성
 */
function buildOverallNarrative(
  mentoring: PulseReport["qualitativeAssessment"]["mentoringRegularity"],
  mentor: PulseReport["qualitativeAssessment"]["dedicatedMentorEngagement"],
  expert: PulseReport["qualitativeAssessment"]["expertRequestActivity"],
  cadence: PulseReport["meetingCadence"]
): string {
  const parts: string[] = [];

  // 멘토링 정기성
  if (mentoring.meetsMonthlyTarget) {
    parts.push("멘토링이 월 1회 이상 안정적으로 진행되고 있음");
  } else {
    parts.push("멘토링 주기가 월 1회 미만으로 관리 강화가 필요함");
  }

  // 전담멘토
  if (mentor.hasDedicatedMentor) {
    if (mentor.isRegular) {
      parts.push(`전담멘토와 정기적 만남을 유지하고 있어 긍정적`);
    } else if (mentor.totalMeetings > 0) {
      parts.push(`전담멘토와의 만남이 있으나 정기성 확보 필요`);
    } else {
      parts.push(`전담멘토가 배정되어 있으나 미팅 기록이 없어 확인 필요`);
    }
  }

  // 전문가 요청
  if (expert.totalRequests >= 2) {
    parts.push("전문가 리소스를 잘 활용하고 있음");
  } else if (expert.totalRequests === 0) {
    parts.push("전문가 리소스 활용이 없어 안내 필요");
  }

  // 미팅 추세
  if (cadence.trend === "slowing") {
    parts.push("다만 최근 미팅 주기가 느려지는 추세여서 주의가 필요함");
  } else if (cadence.trend === "accelerating") {
    parts.push("미팅 빈도가 증가하는 긍정적 추세");
  }

  return parts.join(". ") + ".";
}

// ── 탭 요약 생성 ──────────────────────────────

function buildNarrativeSummary(
  qa: PulseReport["qualitativeAssessment"],
  cadence: PulseReport["meetingCadence"]
): string {
  const parts: string[] = [];

  // 멘토링 정기성
  if (qa.mentoringRegularity.meetsMonthlyTarget) {
    parts.push("멘토링 정기 진행 중");
  } else {
    parts.push("멘토링 주기 점검 필요");
  }

  // 전담멘토
  if (qa.dedicatedMentorEngagement.hasDedicatedMentor) {
    parts.push(qa.dedicatedMentorEngagement.isRegular ? "전담멘토 정기 만남" : "전담멘토 만남 불규칙");
  }

  // 전문가 요청
  if (qa.expertRequestActivity.totalRequests > 0) {
    parts.push(`전문가 ${qa.expertRequestActivity.totalRequests}건 활용`);
  } else {
    parts.push("전문가 미활용");
  }

  // 추세
  if (cadence.trend === "slowing") parts.push("주기 둔화 중");
  else if (cadence.trend === "accelerating") parts.push("주기 가속 중");

  return parts.join(" · ");
}
