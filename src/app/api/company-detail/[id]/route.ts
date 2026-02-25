// ── 온디맨드 기업 상세 데이터 API ──────────────────
// 멘토링 기록 + Pulse(미팅 밀도·마일스톤) 데이터를
// 버튼 클릭 시 클라이언트에서 호출하는 경량 API
import { NextRequest, NextResponse } from "next/server";
import { collectCompanyData, generatePulseReport } from "@/lib/agents";
import { summarizeRecentKpt } from "@/lib/data";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const t0 = Date.now();

  // ① Data Collector 에이전트로 데이터 수집
  const packet = await collectCompanyData(id);

  if (!packet) {
    return NextResponse.json({ error: "기업을 찾을 수 없습니다" }, { status: 404 });
  }

  // ④ Pulse Tracker 에이전트로 건강도 분석
  const pulse = generatePulseReport(packet);

  // 전문가 요청 요약
  const expertSummary = {
    total: packet.expertRequests.length,
    inProgress: packet.expertRequests.filter((r) =>
      ["매칭 중", "검토 중", "일정 확정", "접수"].some((s) =>
        (r.status || "").includes(s)
      )
    ).length,
    completed: packet.expertRequests.filter((r) =>
      ["진행 완료", "완료"].some((s) => (r.status || "").includes(s))
    ).length,
  };

  // KPT 요약
  const kptResult = await summarizeRecentKpt(id, packet.kptReviews);

  console.log(`[perf] /api/company-detail/${id.slice(0, 8)}: ${Date.now() - t0}ms`);

  return NextResponse.json({
    sessions: packet.sessions,
    expertRequests: packet.expertRequests,
    analyses: packet.analyses,
    expertSummary,
    kptSummary: kptResult?.summary ?? null,
    kptCount: kptResult?.count ?? null,
    pulse,
  });
}
