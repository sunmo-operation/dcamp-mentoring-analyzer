import { NextResponse } from "next/server";
import { getMentoringSessionWithTranscript } from "@/lib/data";

interface Props {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: Props) {
  const { id } = await params;
  const session = await getMentoringSessionWithTranscript(id);

  if (!session) {
    return NextResponse.json(
      { error: "세션을 찾을 수 없습니다" },
      { status: 404 }
    );
  }

  return NextResponse.json(session);
}
