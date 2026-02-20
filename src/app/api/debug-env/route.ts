import { NextResponse } from "next/server";

// 환경변수 설정 여부만 확인 (값은 노출하지 않음)
export async function GET() {
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
    status[key] = val ? `설정됨 (${val.slice(0, 6)}...)` : "미설정";
  }

  return NextResponse.json(status);
}
