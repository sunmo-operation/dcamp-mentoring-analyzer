import { NextResponse } from "next/server";
import { getAnalysis } from "@/lib/data";

interface Props {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: Props) {
  const { id } = await params;
  const analysis = await getAnalysis(id);

  if (!analysis) {
    return NextResponse.json(
      { error: "분석 결과를 찾을 수 없습니다" },
      { status: 404 }
    );
  }

  return NextResponse.json(analysis);
}
