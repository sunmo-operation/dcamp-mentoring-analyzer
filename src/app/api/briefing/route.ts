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

// Vercel 함수 실행 시간 제한 (60초)
export const maxDuration = 60;

interface BriefingRequest {
  companyId: string;
  force?: boolean;
}

// SSE 스트리밍 방식으로 브리핑 생성
// 연결을 유지하면서 진행 상황을 실시간 전송 → 타임아웃 방지
export async function POST(request: Request) {
  const encoder = new TextEncoder();

  // SSE 이벤트 전송 헬퍼
  function encode(data: object): Uint8Array {
    return encoder.encode(`data: ${JSON.stringify(data)}\n\n`);
  }

  const body = (await request.json()) as BriefingRequest;
  const { companyId, force = false } = body;

  if (!companyId) {
    return Response.json(
      { success: false, error: "기업 ID는 필수입니다" },
      { status: 400 }
    );
  }

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // 1단계: 데이터 수집
        controller.enqueue(encode({ type: "status", step: 1, message: "Notion에서 데이터 수집 중..." }));

        const [allData, kptReviews, okrItems, okrValues] = await Promise.all([
          getCompanyAllData(companyId),
          getKptReviews(companyId),
          getOkrItems(companyId),
          getOkrValues(companyId),
        ]);

        if (!allData) {
          controller.enqueue(encode({ type: "error", message: "존재하지 않는 기업입니다" }));
          controller.close();
          return;
        }

        const { company, sessions, expertRequests, analyses } = allData;

        // 캐시된 브리핑 확인
        if (!force) {
          const existing = await getBriefingByCompany(companyId);
          if (existing) {
            const { stale } = isBriefingStale(existing, {
              sessions, expertRequests, analyses,
              kptCount: kptReviews.length,
              okrItemCount: okrItems.length,
            });
            if (!stale) {
              controller.enqueue(encode({ type: "complete", briefing: existing, cached: true }));
              controller.close();
              return;
            }
          }
        }

        // 2단계: AI 분석 시작
        controller.enqueue(encode({ type: "status", step: 2, message: "AI가 브리핑을 생성하고 있습니다..." }));

        const dataFingerprint: CompanyBriefing["dataFingerprint"] = {
          lastSessionDate: sessions[0]?.date || null,
          sessionCount: sessions.length,
          expertRequestCount: expertRequests.length,
          analysisCount: analyses.length,
          kptCount: kptReviews.length,
          okrItemCount: okrItems.length,
        };

        const claude = getClaudeClient();
        const systemPrompt = buildBriefingSystemPrompt();
        const userPrompt = buildBriefingUserPrompt(
          company, sessions, expertRequests, analyses,
          kptReviews, okrItems, okrValues
        );

        // Claude 스트리밍 API 호출
        const response = await claude.messages.stream({
          model: process.env.BRIEFING_MODEL || "claude-haiku-4-5-20251001",
          max_tokens: 8192,
          system: systemPrompt,
          messages: [{ role: "user", content: userPrompt }],
        });

        let fullText = "";
        let lastProgressSent = 0;

        // 3단계: AI 응답 수신 중 (실시간 진행률 전송)
        for await (const event of response) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            fullText += event.delta.text;

            // 500자마다 진행률 업데이트 전송
            if (fullText.length - lastProgressSent > 500) {
              lastProgressSent = fullText.length;
              controller.enqueue(encode({
                type: "progress",
                step: 3,
                message: `AI 분석 중... (${Math.round(fullText.length / 50)}% 예상)`,
                length: fullText.length,
              }));
            }
          }
        }

        // 4단계: 결과 처리
        controller.enqueue(encode({ type: "status", step: 4, message: "결과를 정리하고 있습니다..." }));

        // JSON 파싱
        let jsonStr = fullText.trim();
        if (jsonStr.startsWith("```")) {
          jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
        }

        const rawParsed = JSON.parse(jsonStr);
        const validated = briefingResponseSchema.safeParse(nullsToUndefined(rawParsed));
        if (!validated.success) {
          console.error("Claude 브리핑 응답 스키마 검증 실패:", validated.error.format());
          throw new Error(`AI 응답 형식 오류: ${validated.error.issues[0]?.message || "알 수 없는 형식"}`);
        }

        const transformedSections = transformBriefingResponse(validated.data);
        const briefing: CompanyBriefing = {
          id: `briefing-${nanoid(8)}`,
          companyId,
          createdAt: new Date().toISOString(),
          status: "completed",
          ...transformedSections,
          dataFingerprint,
        };

        // 저장 (실패해도 브리핑은 반환)
        try {
          await saveBriefing(briefing);
        } catch (saveError) {
          console.warn("브리핑 저장 실패 (무시):", saveError);
        }

        // 완료
        controller.enqueue(encode({ type: "complete", briefing, cached: false }));
      } catch (error) {
        const msg = error instanceof Error ? error.message : "알 수 없는 오류";
        console.error("브리핑 스트리밍 오류:", error);
        controller.enqueue(encode({ type: "error", message: `브리핑 생성 실패: ${msg}` }));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
