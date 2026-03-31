import { NextResponse } from "next/server";
import { getCompanies } from "@/lib/data";

export async function GET() {
  const companies = await getCompanies();
  return NextResponse.json(companies, {
    headers: {
      // SWR 연동: private 캐시 (민감 데이터 CDN 노출 방지)
      "Cache-Control": "private, s-maxage=60, stale-while-revalidate=120",
    },
  });
}
