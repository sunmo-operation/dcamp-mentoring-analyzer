import { NextResponse } from "next/server";

export async function GET() {
  const envKeys = [
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "AUTH_SECRET",
    "NEXTAUTH_SECRET",
    "AUTH_URL",
    "NEXTAUTH_URL",
    "AUTH_TRUST_HOST",
    "SITE_PASSWORD",
    "ANTHROPIC_API_KEY",
    "NOTION_API_KEY",
    "NOTION_COMPANIES_DB_ID",
    "BRIEFING_MODEL",
    "NEXT_PUBLIC_HAS_SITE_PASSWORD",
    "NODE_ENV",
    "VERCEL",
    "VERCEL_ENV",
  ];

  const checks: Record<string, string> = {};
  for (const key of envKeys) {
    const val = process.env[key];
    if (!val) {
      checks[key] = "(not set)";
    } else if (key.includes("SECRET") || key.includes("PASSWORD") || key.includes("API_KEY")) {
      checks[key] = val.slice(0, 4) + "...";
    } else {
      checks[key] = val;
    }
  }

  return NextResponse.json({ checks });
}
