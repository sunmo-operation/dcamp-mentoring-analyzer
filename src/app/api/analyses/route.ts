import { NextResponse } from "next/server";
import { getAnalyses } from "@/lib/data";

export async function GET() {
  const analyses = await getAnalyses();
  return NextResponse.json(analyses);
}
