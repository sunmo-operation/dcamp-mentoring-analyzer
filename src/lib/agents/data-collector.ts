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
import { extractPageText } from "@/lib/notion";

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

  // Slack 메시지 수집 + 최근 3건 세션 transcript 병렬 fetch (8초 타임아웃)
  const recentSessions = [...allData.sessions]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 3);

  const [slackMessages, ...transcriptResults] = await Promise.all([
    // Slack (5초 타임아웃)
    allData.company.slackChannelId
      ? Promise.race([
          getSlackMessages(allData.company.slackChannelId),
          new Promise<SlackMessage[]>((resolve) => setTimeout(() => resolve([]), 5000)),
        ]).catch(() => [] as SlackMessage[])
      : Promise.resolve([] as SlackMessage[]),
    // 최근 3건 transcript (8초 타임아웃, 개별 실패 허용)
    ...recentSessions.map((s) =>
      Promise.race([
        extractPageText(s.notionPageId).catch(() => ""),
        new Promise<string>((resolve) => setTimeout(() => resolve(""), 8000)),
      ])
    ),
  ]);

  // transcript를 세션에 병합
  for (let i = 0; i < recentSessions.length; i++) {
    const transcript = transcriptResults[i];
    if (transcript && transcript.length > 0) {
      // allData.sessions에서 해당 세션 찾아서 transcript 주입
      const session = allData.sessions.find((s) => s.notionPageId === recentSessions[i].notionPageId);
      if (session) session.transcript = transcript;
    }
  }

  const transcriptCount = transcriptResults.filter((t) => t && t.length > 0).length;

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
  const transcriptSummary = transcriptCount > 0 ? `전문 ${transcriptCount}건` : "전문 없음";
  const coachingSummary = coachingRecords
    ? `코칭(플랜${coachingRecords.coachingPlans.length}/세션${coachingRecords.sessions.length}/투입${coachingRecords.expertDeployments.length})`
    : "코칭 없음";
  console.log(
    `[DataCollector] ${allData.company.name}: ` +
    `세션 ${packet.sessions.length}, ` +
    `전문가요청 ${packet.expertRequests.length}, ${coachingSummary}, ${slackSummary}, ${transcriptSummary} (${Date.now() - t0}ms)`
  );

  return packet;
}
