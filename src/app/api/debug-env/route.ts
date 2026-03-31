import { NextResponse } from "next/server";

// 환경변수 설정 여부만 확인 — 프로덕션에서는 비활성화
export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "프로덕션 환경에서는 사용할 수 없습니다" },
      { status: 403 },
    );
  }

  const keys = [
    "ANTHROPIC_API_KEY",
    "NOTION_API_KEY",
    "NOTION_COMPANIES_DB_ID",
    "NOTION_MENTORS_DB_ID",
    "NOTION_MEETINGS_DB_ID",
  ];

  const status: Record<string, string> = {};
  for (const key of keys) {
    const val = process.env[key];
    // 키 값 일부 노출 방지: 설정 여부만 표시
    status[key] = val ? "설정됨" : "미설정";
  }

  return NextResponse.json(status);
}
