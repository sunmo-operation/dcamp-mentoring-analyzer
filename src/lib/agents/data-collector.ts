// ══════════════════════════════════════════════════
// ① Data Collector Agent
// 노션 DB에서 원시 데이터를 수집·정규화하여
// CompanyDataPacket으로 패키징
// ══════════════════════════════════════════════════

import type { CompanyDataPacket } from "./types";
import {
  getCompanyAllData,
  getKptReviews,
  getOkrItems,
  getOkrValues,
  getCompanyBatchDashboardData,
} from "@/lib/data";
import { getCoachingRecordsByName } from "@/lib/coaching-data";

/**
 * 기업의 모든 데이터를 수집하여 표준 패킷으로 반환
 * 모든 다운스트림 에이전트(Analyst, Narrator, Pulse Tracker)의 공통 입력
 */
export async function collectCompanyData(
  companyId: string
): Promise<CompanyDataPacket | null> {
  const t0 = Date.now();

  // 모든 데이터를 병렬 수집
  const [allData, kptReviews, okrItems, okrValues] = await Promise.all([
    getCompanyAllData(companyId),
    getKptReviews(companyId),
    getOkrItems(companyId),
    getOkrValues(companyId),
  ]);

  if (!allData) return null;

  // 배치 대시보드 (타임아웃 8초)
  const batchData = await Promise.race([
    getCompanyBatchDashboardData(allData.company),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), 8000)),
  ]).catch(() => null);

  // 엑셀 코칭 기록 (로컬 JSON, 즉시 반환)
  const coachingRecords = getCoachingRecordsByName(allData.company.name);

  const packet: CompanyDataPacket = {
    company: allData.company,
    sessions: allData.sessions,
    expertRequests: allData.expertRequests,
    analyses: allData.analyses,
    kptReviews,
    okrItems,
    okrValues,
    batchData,
    coachingRecords,
    collectedAt: new Date().toISOString(),
  };

  const coachingSummary = coachingRecords
    ? `코칭(플랜${coachingRecords.coachingPlans.length}/세션${coachingRecords.sessions.length}/투입${coachingRecords.expertDeployments.length})`
    : "코칭 없음";
  console.log(
    `[DataCollector] ${allData.company.name}: ` +
    `세션 ${packet.sessions.length}, KPT ${packet.kptReviews.length}, ` +
    `OKR ${packet.okrItems.length}항목/${packet.okrValues.length}값, ` +
    `전문가요청 ${packet.expertRequests.length}, ${coachingSummary} (${Date.now() - t0}ms)`
  );

  return packet;
}
