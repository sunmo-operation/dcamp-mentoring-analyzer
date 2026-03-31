import { handlers } from "@/auth";
import { NextRequest } from "next/server";

// handlers를 래핑하여 에러 로깅 추가
export async function GET(req: NextRequest) {
  try {
    return await handlers.GET(req);
  } catch (error) {
    console.error("[NextAuth GET] 에러:", error);
    return Response.json(
      { error: "auth handler failed", detail: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    return await handlers.POST(req);
  } catch (error) {
    console.error("[NextAuth POST] 에러:", error);
    return Response.json(
      { error: "auth handler failed", detail: String(error) },
      { status: 500 }
    );
  }
}
