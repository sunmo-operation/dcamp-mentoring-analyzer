// ══════════════════════════════════════════════════
// ① Data Collector Agent
// 노션 DB에서 원시 데이터를 수집·정규화하여
// CompanyDataPacket으로 패키징
// ══════════════════════════════════════════════════

import type { CompanyDataPacket } from "./types";
import {
  getCompanyAllData,
  getKptReviews,
  getBatchKptReviews,
  getOkrItems,
  getOkrValues,
  getCompanyBatchDashboardData,
} from "@/lib/data";
import { getCoachingRecordsByName } from "@/lib/coaching-data";
import { getSlackMessages } from "@/lib/slack";
import type { SlackMessage } from "@/lib/slack";

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

  // 배치 대시보드 + Slack 메시지 + 배치 KPT를 병렬 수집
  const [batchData, slackMessages, batchKptReviews] = await Promise.all([
    Promise.race([
      getCompanyBatchDashboardData(allData.company),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 8000)),
    ]).catch(() => null),
    // Slack: 채널 ID가 있으면 메시지 수집, 5초 타임아웃
    allData.company.slackChannelId
      ? Promise.race([
          getSlackMessages(allData.company.slackChannelId),
          new Promise<SlackMessage[]>((resolve) => setTimeout(() => resolve([]), 5000)),
        ]).catch(() => [] as SlackMessage[])
      : Promise.resolve([] as SlackMessage[]),
    // 배치 기업별 대시보드에서 KPT 데이터 수집
    allData.company.batchLabel
      ? Promise.race([
          getBatchKptReviews(allData.company.name, allData.company.batchLabel),
          new Promise<never[]>((resolve) => setTimeout(() => resolve([]), 8000)),
        ]).catch(() => [])
      : Promise.resolve([]),
  ]);

  // KPT 병합: 전용 DB 데이터가 있으면 그대로, 없으면 배치 KPT로 대체
  const mergedKptReviews = kptReviews.length > 0
    ? kptReviews
    : batchKptReviews;

  // 엑셀 코칭 기록 (로컬 JSON, 즉시 반환)
  const coachingRecords = getCoachingRecordsByName(allData.company.name);

  const packet: CompanyDataPacket = {
    company: allData.company,
    sessions: allData.sessions,
    expertRequests: allData.expertRequests,
    analyses: allData.analyses,
    kptReviews: mergedKptReviews,
    okrItems,
    okrValues,
    batchData,
    coachingRecords,
    slackMessages,
    collectedAt: new Date().toISOString(),
  };

  const kptSource = kptReviews.length > 0 ? "전용DB" : batchKptReviews.length > 0 ? "배치" : "없음";
  const coachingSummary = coachingRecords
    ? `코칭(플랜${coachingRecords.coachingPlans.length}/세션${coachingRecords.sessions.length}/투입${coachingRecords.expertDeployments.length})`
    : "코칭 없음";
  const slackSummary = slackMessages.length > 0 ? `Slack ${slackMessages.length}건` : "Slack 없음";
  console.log(
    `[DataCollector] ${allData.company.name}: ` +
    `세션 ${packet.sessions.length}, KPT ${packet.kptReviews.length}건(${kptSource}), ` +
    `OKR ${packet.okrItems.length}항목/${packet.okrValues.length}값, ` +
    `전문가요청 ${packet.expertRequests.length}, ${coachingSummary}, ${slackSummary} (${Date.now() - t0}ms)`
  );

  return packet;
}
