import { NextRequest, NextResponse } from "next/server";
import {
  getCompaniesBasic,
  getCompanyAllData,
  clearCache,
} from "@/lib/data";

/**
 * 노션 데이터 동기화 Cron 엔드포인트
 *
 * - Vercel Cron: 매일 09:00 / 18:00 KST 자동 호출
 * - 수동 트리거: GET /api/cron/sync (CRON_SECRET 필요)
 *
 * 동작:
 * 1. 인메모리 캐시 전체 클리어
 * 2. 기업 목록 조회 (Notion → 캐시 워밍)
 * 3. 각 기업 상세 데이터 조회 (캐시 워밍)
 */
export const maxDuration = 300; // 5분 (기업 수가 많을 수 있음)

export async function GET(request: NextRequest) {
  // CRON_SECRET 검증 (Vercel Cron 또는 수동 호출)
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (token !== cronSecret) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
  }

  const startTime = Date.now();
  const log: string[] = [];

  try {
    // 1. 캐시 클리어
    clearCache();
    log.push("캐시 클리어 완료");

    // 2. 기업 목록 조회 (캐시 워밍)
    const companies = await getCompaniesBasic();
    log.push(`기업 ${companies.length}개 목록 조회 완료`);

    // 3. 각 기업 상세 데이터 사전 로드 (순차 — Notion API rate limit 고려)
    let successCount = 0;
    let failCount = 0;

    for (const company of companies) {
      const companyId = company.notionPageId;
      if (!companyId) continue;

      try {
        await getCompanyAllData(companyId);
        successCount++;
      } catch (error) {
        failCount++;
        console.warn(`[cron] ${company.name} 데이터 로드 실패:`, error);
      }
    }

    log.push(`상세 데이터: 성공 ${successCount}건, 실패 ${failCount}건`);

    const elapsed = Date.now() - startTime;
    log.push(`소요 시간: ${(elapsed / 1000).toFixed(1)}초`);

    console.log(`[cron/sync] 완료 — ${log.join(" | ")}`);

    return NextResponse.json({
      ok: true,
      syncedAt: new Date().toISOString(),
      companies: companies.length,
      detail: { success: successCount, fail: failCount },
      elapsedMs: elapsed,
      log,
    });
  } catch (error) {
    const elapsed = Date.now() - startTime;
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[cron/sync] 실패 (${elapsed}ms):`, error);

    return NextResponse.json(
      {
        ok: false,
        error: message,
        elapsedMs: elapsed,
        log,
      },
      { status: 500 }
    );
  }
}
