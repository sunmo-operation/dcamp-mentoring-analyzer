import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { getClaudeClient } from "@/lib/claude";
import {
  buildBriefingSystemPrompt,
  buildBriefingUserPrompt,
} from "@/lib/briefing-prompts";
import {
  getCompanyAllData,
  getBriefingByCompany,
  saveBriefing,
  isBriefingStale,
  getKptReviews,
  getOkrItems,
  getOkrValues,
} from "@/lib/data";
import type { CompanyBriefing } from "@/types";
import {
  briefingResponseSchema,
  transformBriefingResponse,
  nullsToUndefined,
} from "@/lib/schemas";

interface BriefingRequest {
  companyId: string;
  force?: boolean;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as BriefingRequest;
    const { companyId, force = false } = body;

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: "기업 ID는 필수입니다" },
        { status: 400 }
      );
    }

    // 기업 전체 데이터 + KPT/OKR 병렬 조회
    const [allData, kptReviews, okrItems, okrValues] = await Promise.all([
      getCompanyAllData(companyId),
      getKptReviews(companyId),
      getOkrItems(companyId),
      getOkrValues(companyId),
    ]);

    if (!allData) {
      return NextResponse.json(
        { success: false, error: "존재하지 않는 기업입니다" },
        { status: 404 }
      );
    }

    const { company, sessions, expertRequests, analyses } = allData;

    // force=false일 때 fresh 브리핑 있으면 기존 것 반환
    if (!force) {
      const existing = await getBriefingByCompany(companyId);
      if (existing) {
        const { stale } = isBriefingStale(existing, {
          sessions,
          expertRequests,
          analyses,
          kptCount: kptReviews.length,
          okrItemCount: okrItems.length,
        });
        if (!stale) {
          return NextResponse.json({
            success: true,
            briefing: existing,
            cached: true,
          });
        }
      }
    }

    // dataFingerprint 계산
    const dataFingerprint: CompanyBriefing["dataFingerprint"] = {
      lastSessionDate: sessions[0]?.date || null,
      sessionCount: sessions.length,
      expertRequestCount: expertRequests.length,
      analysisCount: analyses.length,
      kptCount: kptReviews.length,
      okrItemCount: okrItems.length,
    };

    // Claude API 호출
    const claude = getClaudeClient();
    const systemPrompt = buildBriefingSystemPrompt();
    const userPrompt = buildBriefingUserPrompt(
      company,
      sessions,
      expertRequests,
      analyses,
      kptReviews,
      okrItems,
      okrValues
    );

    const message = await claude.messages.create({
      model: process.env.BRIEFING_MODEL || "claude-haiku-4-5-20251001",
      max_tokens: 8192,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    // 응답에서 텍스트 추출
    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("Claude 응답에서 텍스트를 찾을 수 없습니다");
    }

    // 응답이 토큰 한도에 의해 잘렸는지 확인
    if (message.stop_reason === "max_tokens") {
      throw new Error("AI 응답이 너무 길어 잘렸습니다. 다시 시도해주세요.");
    }

    // JSON 파싱 (마크다운 코드블록 제거 대응)
    let jsonStr = textBlock.text.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    const rawParsed = JSON.parse(jsonStr);

    // null → undefined 전처리 후 Zod 검증
    const validated = briefingResponseSchema.safeParse(nullsToUndefined(rawParsed));
    if (!validated.success) {
      console.error("Claude 브리핑 응답 스키마 검증 실패:", validated.error.format());
      throw new Error(`AI 응답 형식 오류: ${validated.error.issues[0]?.message || "알 수 없는 형식"}`);
    }

    const transformedSections = transformBriefingResponse(validated.data);

    // 브리핑 저장
    const briefing: CompanyBriefing = {
      id: `briefing-${nanoid(8)}`,
      companyId,
      createdAt: new Date().toISOString(),
      status: "completed",
      ...transformedSections,
      dataFingerprint,
    };

    await saveBriefing(briefing);

    return NextResponse.json({
      success: true,
      briefing,
      cached: false,
    });
  } catch (error) {
    console.error("브리핑 생성 오류:", error);

    const errorMessage =
      error instanceof Error ? error.message : "알 수 없는 오류";

    // 사용자에게는 내부 정보를 노출하지 않음
    const isDev = process.env.NODE_ENV === "development";

    if (errorMessage.includes("ANTHROPIC_API_KEY")) {
      return NextResponse.json(
        {
          success: false,
          error: isDev
            ? "API 키가 설정되지 않았습니다. .env.local 파일에 ANTHROPIC_API_KEY를 추가하세요."
            : "서버 설정 오류가 발생했습니다. 관리자에게 문의하세요.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: isDev
          ? `브리핑 생성 실패: ${errorMessage}`
          : "브리핑 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
      },
      { status: 500 }
    );
  }
}
