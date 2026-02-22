// ── 온디맨드 기업 상세 데이터 API ──────────────────
// 멘토링 기록, 타임라인, 전문가 요청, 분석 이력을
// 버튼 클릭 시 클라이언트에서 호출하는 경량 API
// 초기 페이지 로드에서 Notion API 4회 → 0회로 줄여 속도 개선
import { NextRequest, NextResponse } from "next/server";
import {
  getCompanyAllData,
  getKptReviews,
  summarizeRecentKpt,
} from "@/lib/data";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const t0 = Date.now();

  const [allData, kptReviews] = await Promise.all([
    getCompanyAllData(id),
    getKptReviews(id),
  ]);

  if (!allData) {
    return NextResponse.json({ error: "기업을 찾을 수 없습니다" }, { status: 404 });
  }

  const { sessions, expertRequests, timeline, analyses } = allData;

  // 전문가 요청 요약
  const expertSummary = {
    total: expertRequests.length,
    inProgress: expertRequests.filter((r) =>
      ["매칭 중", "검토 중", "일정 확정", "접수"].some((s) =>
        (r.status || "").includes(s)
      )
    ).length,
    completed: expertRequests.filter((r) =>
      ["진행 완료", "완료"].some((s) => (r.status || "").includes(s))
    ).length,
  };

  // KPT 요약
  const kptResult = await summarizeRecentKpt(id, kptReviews);

  console.log(`[perf] /api/company-detail/${id.slice(0, 8)}: ${Date.now() - t0}ms`);

  return NextResponse.json({
    sessions,
    expertRequests,
    timeline,
    analyses,
    expertSummary,
    kptSummary: kptResult?.summary ?? null,
    kptCount: kptResult?.count ?? null,
  });
}
