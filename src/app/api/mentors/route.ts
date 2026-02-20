import { NextResponse } from "next/server";
import { getMentors, getMentorsByCompany } from "@/lib/data";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get("companyId");

  if (companyId) {
    // 해당 기업 담당 멘토 + 전체 멘토
    const [companyMentors, allMentors] = await Promise.all([
      getMentorsByCompany(companyId),
      getMentors(),
    ]);

    // 담당 멘토 pageId set
    const companyMentorIds = new Set(companyMentors.map((m) => m.notionPageId));
    // 전체 목록에서 담당 멘토 제외 (중복 방지)
    const otherMentors = allMentors.filter(
      (m) => !companyMentorIds.has(m.notionPageId)
    );

    return NextResponse.json({ companyMentors, otherMentors });
  }

  const allMentors = await getMentors();
  return NextResponse.json({ companyMentors: [], otherMentors: allMentors });
}
