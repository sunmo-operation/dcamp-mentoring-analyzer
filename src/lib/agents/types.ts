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

  // 종합 건강 신호
  healthSignals: {
    signal: string;
    status: "good" | "warning" | "concern";
    detail: string;
  }[];
}
