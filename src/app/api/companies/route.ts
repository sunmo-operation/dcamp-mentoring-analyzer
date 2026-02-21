import { NextResponse } from "next/server";
import { getCompanies } from "@/lib/data";

export async function GET() {
  const companies = await getCompanies();
  return NextResponse.json(companies, {
    headers: {
      // SWR 연동: 짧은 서버 캐시 (60초) + stale-while-revalidate
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
    },
  });
}
