// ══════════════════════════════════════════════════
// Slack Web API — 기업 채널 메시지 수집
// 브리핑 프롬프트에 Slack 컨텍스트를 제공하기 위한 모듈
// ══════════════════════════════════════════════════

import { WebClient } from "@slack/web-api";

// Slack 메시지를 AI 브리핑에 전달할 형태
export interface SlackMessage {
  ts: string; // 타임스탬프 (Slack 고유 ID)
  date: string; // ISO 날짜 (YYYY-MM-DD)
  user: string; // 사용자명 또는 ID
  text: string; // 메시지 본문
}

// 캐시: channelId → { messages, expires }
const slackCache = new Map<
  string,
  { messages: SlackMessage[]; expires: number }
>();
const CACHE_TTL = 10 * 60 * 1000; // 10분

let _client: WebClient | null = null;

function getSlackClient(): WebClient | null {
  if (_client) return _client;
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) {
    console.warn("[slack] SLACK_BOT_TOKEN 미설정 — Slack 연동 비활성화");
    return null;
  }
  _client = new WebClient(token);
  return _client;
}

/**
 * 특정 Slack 채널에서 최근 메시지를 가져옴
 * @param channelId - Slack 채널 ID (Company.slackChannelId)
 * @param limit - 가져올 메시지 수 (기본 20)
 * @returns SlackMessage[] (실패 시 빈 배열)
 */
export async function getSlackMessages(
  channelId: string,
  limit: number = 20
): Promise<SlackMessage[]> {
  if (!channelId) return [];

  // 캐시 확인
  const cached = slackCache.get(channelId);
  if (cached && cached.expires > Date.now()) {
    return cached.messages;
  }

  const client = getSlackClient();
  if (!client) return [];

  try {
    const result = await client.conversations.history({
      channel: channelId,
      limit,
    });

    if (!result.ok || !result.messages) {
      console.warn(`[slack] 채널 ${channelId} 메시지 조회 실패:`, result.error);
      return [];
    }

    // 봇 메시지, 시스템 메시지 필터링 — 사람이 쓴 메시지만
    const messages: SlackMessage[] = result.messages
      .filter((m) => m.type === "message" && !m.subtype && m.text)
      .map((m) => ({
        ts: m.ts || "",
        date: m.ts
          ? new Date(parseFloat(m.ts) * 1000).toISOString().split("T")[0]
          : "",
        user: m.user || "unknown",
        text: (m.text || "").slice(0, 500), // 메시지당 최대 500자
      }));

    // 캐시 저장
    slackCache.set(channelId, {
      messages,
      expires: Date.now() + CACHE_TTL,
    });

    console.log(
      `[slack] 채널 ${channelId}: ${messages.length}건 메시지 수집`
    );
    return messages;
  } catch (error) {
    console.warn(`[slack] 채널 ${channelId} 조회 에러:`, error);
    return [];
  }
}
