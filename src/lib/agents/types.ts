// ══════════════════════════════════════════════════
// 에이전트 공통 타입
// 모든 에이전트는 독립적으로 동작하되,
// CompanyDataPacket을 공통 입력으로 사용
// ══════════════════════════════════════════════════

import type {
  Company,
  MentoringSession,
  ExpertRequest,
  AnalysisResult,
  KptReview,
  OkrItem,
  OkrValue,
  BatchDashboardData,
} from "@/types";

/**
 * Data Collector 출력 — 모든 에이전트의 공통 입력
 * 한 기업에 대한 모든 원시 데이터를 정규화하여 패키징
 */
export interface CompanyDataPacket {
  company: Company;
  sessions: MentoringSession[];
  expertRequests: ExpertRequest[];
  analyses: AnalysisResult[];
  kptReviews: KptReview[];
  okrItems: OkrItem[];
  okrValues: OkrValue[];
  batchData: BatchDashboardData | null;
  collectedAt: string;
}

/**
 * Pulse Tracker 출력 — 기업의 시계열 건강도
 */
export interface PulseReport {
  // 미팅 주기/밀도 분석
  meetingCadence: {
    avgIntervalDays: number; // 평균 미팅 간격 (일)
    recentIntervalDays: number; // 최근 3회 평균 간격
    trend: "accelerating" | "stable" | "slowing" | "irregular";
    trendReason: string;
    totalSessions: number;
    periodMonths: number; // 첫 미팅~마지막 미팅 기간
    byType: { type: string; count: number; lastDate: string }[];
    // 밀도 점수 (0~100)
    densityScore: number;
    densityLabel: string; // "매우 활발" | "양호" | "느슨" | "경고"
  };

  // 주요 마일스톤 타임라인
  milestones: {
    date: string;
    title: string;
    category: "성과" | "전환점" | "리스크" | "의사결정" | "외부";
    source: string; // "멘토링" | "KPT" | "OKR" | "전문가요청"
    detail?: string;
  }[];

  // 디캠프 프로그램 참여도
  programEngagement: {
    overallScore: number; // 0~100
    label: string; // "적극 활용" | "보통" | "저조" | "미참여"
    breakdown: {
      area: string; // "멘토링" | "전문가 투입" | "KPT 회고" | "OKR 관리" | "전문가 요청"
      score: number; // 0~100
      detail: string;
      hasData: boolean; // 데이터 존재 여부 — false면 점수 산정에서 제외
      weight: number; // 실제 적용된 가중치 (0이면 제외됨)
    }[];
  };

  // 종합 건강 신호
  healthSignals: {
    signal: string;
    status: "good" | "warning" | "concern";
    detail: string;
  }[];

  // 탭 요약 (한 줄)
  summary: string;
}

/**
 * Analyst 출력 — 데이터 기반 구조화된 분석 (AI 호출 없음)
 * Narrator 에이전트의 입력으로 사용
 */
export interface AnalystReport {
  // OKR 진척 분석
  okrAnalysis: {
    overallRate: number | null;
    objectives: {
      name: string;
      level: string;
      achievementRate: number | null;
      achieved: boolean;
      hasValues: boolean; // 측정값 존재 여부
      latestValue?: number;
      targetValue?: number;
    }[];
    hasGap: boolean; // 달성율 vs 실제 데이터 괴리
    gapDetail?: string;
  };

  // 세션 토픽 분석
  topicAnalysis: {
    topKeywords: { keyword: string; count: number; lastSeen: string }[];
    recurringTopics: { topic: string; sessions: string[]; frequency: number }[];
    recentFocus: string[]; // 최근 3회 핵심 토픽
  };

  // 멘토 조언 패턴
  mentorPatterns: {
    mentors: { name: string; sessionCount: number; lastDate: string }[];
    adviceThemes: { theme: string; count: number; examples: string[] }[];
    followUpRate: number; // 후속조치 기록이 있는 세션 비율 (0~1)
  };

  // 전문가 리소스 분석
  expertAnalysis: {
    total: number;
    byStatus: { status: string; count: number }[];
    avgResponseDays: number | null; // 요청~완료 평균 일수
    demandAreas: string[]; // 요청 분야 패턴
    pendingUrgent: number; // 긴급 미처리 건
  };

  // KPT 패턴 분석
  kptPatterns: {
    totalReviews: number;
    recentKeep: string[]; // 최근 3건 Keep
    recentProblem: string[]; // 최근 3건 Problem
    recentTry: string[]; // 최근 3건 Try
    recurringProblems: string[]; // 2회 이상 등장한 Problem 키워드
  };

  // 데이터 품질/공백
  dataGaps: {
    area: string;
    detail: string;
    severity: "high" | "medium" | "low";
  }[];

  // 활동 강도 타임라인 (월별)
  activityTimeline: {
    month: string; // "2025-01"
    sessionCount: number;
    kptCount: number;
    expertRequestCount: number;
  }[];

  // Narrator에게 전달할 컨텍스트 요약 (텍스트)
  narrativeContext: string;
}
