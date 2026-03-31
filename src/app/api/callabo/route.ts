import { NextResponse } from "next/server";
import { getCompaniesBasic } from "@/lib/data";
import {
  fetchCallaboEvents,
  deleteCallaboEvent,
  callaboEventToSession,
  checkCallaboHealth,
} from "@/lib/callabo";

/**
 * GET /api/callabo — Callabo 웹훅 서버 상태 + 미처리 이벤트 조회
 */
export async function GET() {
  const health = await checkCallaboHealth();
  const events = health.ok ? await fetchCallaboEvents() : [];

  return NextResponse.json({
    webhook: health,
    pendingEvents: events.length,
    events: events.map((e) => ({
      id: e.id,
      receivedAt: e.received_at,
      title: e.payload.title,
      date: e.payload.date,
      participants: e.payload.participants.map((p) => p.name),
      duration: e.payload.duration,
      transcriptLength: e.payload.transcript?.length || 0,
    })),
  });
}

/**
 * POST /api/callabo — Callabo 이벤트 동기화
 *
 * 필터링 규칙 (둘 중 하나 충족 시 가져옴):
 *   1. 제목에 "배치" 포함
 *   2. 제목에 DB 기업명 포함
 * → 필터 통과한 이벤트만 MentoringSession으로 변환
 * → 처리 완료된 이벤트는 웹훅 서버에서 삭제
 */
export async function POST() {
  const events = await fetchCallaboEvents();
  if (events.length === 0) {
    return NextResponse.json({ ok: true, message: "처리할 이벤트 없음", synced: 0 });
  }

  // 기업 목록 가져오기 (이름 매칭 + 필터링용)
  const companies = await getCompaniesBasic();
  const companyNames = companies.map((c) => c.name.toLowerCase());

  const results: {
    eventId: number;
    title: string;
    matched: boolean;
    companyName?: string;
    skipped?: boolean;
    skipReason?: string;
  }[] = [];

  for (const event of events) {
    const title = event.payload.title;
    const titleLower = title.toLowerCase();

    // 필터링: "배치" 포함 또는 기업명 매칭
    const hasBatch = titleLower.includes("배치");
    const matchedByTitle = companyNames.find(
      (name) => titleLower.includes(name) || name.includes(titleLower)
    );

    if (!hasBatch && !matchedByTitle) {
      results.push({
        eventId: event.id,
        title,
        matched: false,
        skipped: true,
        skipReason: "필터 미충족 (배치 키워드 없음, 기업명 미매칭)",
      });
      // 관련 없는 이벤트도 큐에서 제거 (재처리 방지)
      await deleteCallaboEvent(event.id);
      continue;
    }

    const session = callaboEventToSession(event);

    // 기업명 정밀 매칭: companyNameHint로 기업 검색
    const matchedCompany = companies.find((c) => {
      const hint = session.companyNameHint.toLowerCase();
      const name = c.name.toLowerCase();
      return name.includes(hint) || hint.includes(name);
    });

    results.push({
      eventId: event.id,
      title,
      matched: !!matchedCompany,
      companyName: matchedCompany?.name,
    });

    // 처리 완료 → 웹훅 서버에서 삭제
    await deleteCallaboEvent(event.id);
  }

  const synced = results.filter((r) => !r.skipped);
  const skipped = results.filter((r) => r.skipped);

  console.log(
    `[callabo] 동기화: 전체 ${results.length}건, 처리 ${synced.length}건 (매칭 ${synced.filter((r) => r.matched).length}건), 스킵 ${skipped.length}건`
  );

  return NextResponse.json({
    ok: true,
    total: results.length,
    synced: synced.length,
    matched: synced.filter((r) => r.matched).length,
    skipped: skipped.length,
    results,
  });
}
