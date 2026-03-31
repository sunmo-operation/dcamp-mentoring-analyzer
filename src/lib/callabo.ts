// ══════════════════════════════════════════════════
// callabo.ts — Callabo 웹훅 서버 연동
// Railway 웹훅 서버에서 회의 이벤트를 가져와 MentoringSession 형태로 변환
// ══════════════════════════════════════════════════

import type { MentoringSession } from "@/types";

const CALLABO_WEBHOOK_URL = process.env.CALLABO_WEBHOOK_URL || "https://callabo-webhook-production.up.railway.app";
const CALLABO_AUTH_TOKEN = process.env.CALLABO_AUTH_TOKEN || "";

interface CallaboParticipant {
  name: string;
}

interface CallaboPayload {
  title: string;
  date: string;
  transcript: string;
  participants: CallaboParticipant[];
  duration?: number;
}

interface CallaboEvent {
  id: number;
  received_at: string;
  payload: CallaboPayload;
}

interface CallaboEventsResponse {
  events: CallaboEvent[];
  total: number;
}

function authHeaders(): Record<string, string> {
  if (!CALLABO_AUTH_TOKEN) return {};
  return { Authorization: `Bearer ${CALLABO_AUTH_TOKEN}` };
}

/**
 * 웹훅 서버에서 미처리 이벤트 조회
 */
export async function fetchCallaboEvents(limit = 100): Promise<CallaboEvent[]> {
  const res = await fetch(`${CALLABO_WEBHOOK_URL}/events?limit=${limit}`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    console.warn(`[callabo] 이벤트 조회 실패: ${res.status}`);
    return [];
  }
  const data: CallaboEventsResponse = await res.json();
  return data.events;
}

/**
 * 처리 완료된 이벤트 삭제
 */
export async function deleteCallaboEvent(eventId: number): Promise<boolean> {
  const res = await fetch(`${CALLABO_WEBHOOK_URL}/events/${eventId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  return res.ok;
}

/**
 * Callabo 이벤트 → MentoringSession 변환
 * 기업명은 title에서 추출 (예: "[6기] 알엑스 배치 멘토링" → "알엑스")
 */
export function callaboEventToSession(event: CallaboEvent): MentoringSession & { companyNameHint: string } {
  const { payload } = event;

  // title에서 기업명 추출: "[6기] 알엑스 배치 멘토링" → "알엑스"
  // 패턴: [N기] 기업명 세션유형
  const titleMatch = payload.title.match(/\[.*?\]\s*(.+?)(?:\s+(?:배치|멘토링|코칭|점검|회고|그로스|킥오프))/);
  const companyNameHint = titleMatch?.[1]?.trim() || payload.title;

  // 참석자에서 멘토 이름 추출
  const mentorNames = payload.participants.map((p) => p.name);

  return {
    notionPageId: `callabo-${event.id}`,
    title: payload.title,
    date: payload.date,
    sessionTypes: guessSessionTypes(payload.title),
    summary: payload.transcript,
    durationHours: payload.duration ? payload.duration / 60 : undefined,
    companyIds: [],
    mentorNames,
    source: "manual",
    companyNameHint,
  };
}

/**
 * title에서 세션 유형 추측
 */
function guessSessionTypes(title: string): string[] {
  const lower = title.toLowerCase();
  if (lower.includes("코칭") || lower.includes("그로스")) return ["전문가투입"];
  if (lower.includes("점검") || lower.includes("체크업")) return ["점검"];
  if (lower.includes("회고")) return ["회고"];
  if (lower.includes("킥오프")) return ["점검"];
  return ["멘토"];
}

/**
 * 웹훅 서버 상태 확인
 */
export async function checkCallaboHealth(): Promise<{ ok: boolean; pendingEvents: number }> {
  try {
    const res = await fetch(`${CALLABO_WEBHOOK_URL}/health`);
    if (!res.ok) return { ok: false, pendingEvents: 0 };
    const data = await res.json();
    return { ok: true, pendingEvents: data.pending_events || 0 };
  } catch {
    return { ok: false, pendingEvents: 0 };
  }
}
