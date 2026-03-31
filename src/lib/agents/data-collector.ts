// ══════════════════════════════════════════════════
// ① Data Collector Agent
// 노션 DB에서 원시 데이터를 수집·정규화하여
// CompanyDataPacket으로 패키징
// ══════════════════════════════════════════════════

import type { CompanyDataPacket } from "./types";
import { getCompanyAllData } from "@/lib/data";
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

  // 기본 데이터 수집
  const allData = await getCompanyAllData(companyId);
  if (!allData) return null;

  // Slack 메시지 수집 (5초 타임아웃)
  const slackMessages = allData.company.slackChannelId
    ? await Promise.race([
        getSlackMessages(allData.company.slackChannelId),
        new Promise<SlackMessage[]>((resolve) => setTimeout(() => resolve([]), 5000)),
      ]).catch(() => [] as SlackMessage[])
    : [];

  // 엑셀 코칭 기록 (로컬 JSON, 즉시 반환)
  const coachingRecords = getCoachingRecordsByName(allData.company.name);

  const packet: CompanyDataPacket = {
    company: allData.company,
    sessions: allData.sessions,
    expertRequests: allData.expertRequests,
    analyses: allData.analyses,
    kptReviews: [],
    okrItems: [],
    okrValues: [],
    batchData: null,
    coachingRecords,
    slackMessages,
    collectedAt: new Date().toISOString(),
  };

  const slackSummary = slackMessages.length > 0 ? `Slack ${slackMessages.length}건` : "Slack 없음";
  const coachingSummary = coachingRecords
    ? `코칭(플랜${coachingRecords.coachingPlans.length}/세션${coachingRecords.sessions.length}/투입${coachingRecords.expertDeployments.length})`
    : "코칭 없음";
  console.log(
    `[DataCollector] ${allData.company.name}: ` +
    `세션 ${packet.sessions.length}, ` +
    `전문가요청 ${packet.expertRequests.length}, ${coachingSummary}, ${slackSummary} (${Date.now() - t0}ms)`
  );

  return packet;
}
