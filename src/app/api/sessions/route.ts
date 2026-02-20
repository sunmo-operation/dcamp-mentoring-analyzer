import { NextResponse } from "next/server";
import { getMentoringSessionsByCompany } from "@/lib/data";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get("companyId");

  if (!companyId) {
    return NextResponse.json(
      { error: "companyId 파라미터가 필요합니다" },
      { status: 400 }
    );
  }

  const sessions = await getMentoringSessionsByCompany(companyId);
  return NextResponse.json(sessions);
}
