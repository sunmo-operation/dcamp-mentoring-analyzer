import { NextRequest, NextResponse } from "next/server";
import { getCompanyAllData, getKptReviews } from "@/lib/data";

// 호버 프리페치: 서버 캐시 워밍만 수행하고 즉시 응답
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  // fire-and-forget: 캐시 워밍을 백그라운드로 실행
  // await 하지 않아 클라이언트는 즉시 응답 받음
  Promise.all([getCompanyAllData(id), getKptReviews(id)]).catch(() => {
    // 캐시 워밍 실패는 무시 (실제 페이지 방문 시 재시도됨)
  });

  return NextResponse.json({ ok: true });
}
