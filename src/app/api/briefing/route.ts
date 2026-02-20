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

// Vercel 함수 실행 시간 제한
// Hobby 플랜: 최대 10초 (스트리밍 시 최대 60초)
// Pro 플랜: 최대 300초
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
      // heartbeat: 3초마다 ping 전송 → 연결 유지 (Vercel 스트리밍 타임아웃 방지)
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encode({ type: "heartbeat" }));
        } catch {
          // 스트림이 이미 닫혔으면 무시
        }
      }, 3000);

      const startTime = Date.now();

      try {
        // 즉시 첫 이벤트 전송 (Vercel이 스트리밍 함수로 인식하도록)
        controller.enqueue(encode({ type: "heartbeat" }));

        // 1단계: 데이터 수집
        controller.enqueue(encode({
          type: "status", step: 1, totalSteps: 3,
          message: "Notion에서 데이터를 가져오고 있어요",
          elapsed: 0,
        }));

        const [allData, kptReviews, okrItems, okrValues] = await Promise.all([
          getCompanyAllData(companyId),
          getKptReviews(companyId),
          getOkrItems(companyId),
          getOkrValues(companyId),
        ]);

        if (!allData) {
          controller.enqueue(encode({ type: "error", message: "존재하지 않는 기업입니다" }));
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
              return;
            }
          }
        }

        // 2단계: AI 분석 시작
        const elapsed2 = Math.round((Date.now() - startTime) / 1000);
        controller.enqueue(encode({
          type: "status", step: 2, totalSteps: 3,
          message: "AI가 브리핑을 작성하고 있어요",
          elapsed: elapsed2,
        }));

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

        // Claude 스트리밍 API 호출 (max_tokens 축소 → 응답 속도 개선)
        const response = await claude.messages.stream({
          model: process.env.BRIEFING_MODEL || "claude-haiku-4-5-20251001",
          max_tokens: 4096,
          system: systemPrompt,
          messages: [{ role: "user", content: userPrompt }],
        });

        let fullText = "";
        let lastProgressSent = 0;

        // AI 응답 수신 중 (실시간 진행률 전송)
        for await (const event of response) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            fullText += event.delta.text;

            // 500자마다 진행률 업데이트 전송
            if (fullText.length - lastProgressSent > 500) {
              lastProgressSent = fullText.length;
              const pct = Math.min(Math.round((fullText.length / 3500) * 90), 90);
              const elapsed3 = Math.round((Date.now() - startTime) / 1000);
              controller.enqueue(encode({
                type: "progress",
                step: 2, totalSteps: 3,
                message: `AI가 브리핑을 작성하고 있어요`,
                pct,
                elapsed: elapsed3,
              }));
            }
          }
        }

        // 3단계: 결과 처리
        const elapsed4 = Math.round((Date.now() - startTime) / 1000);
        controller.enqueue(encode({
          type: "status", step: 3, totalSteps: 3,
          message: "거의 다 됐어요!",
          elapsed: elapsed4,
        }));

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
        const totalElapsed = Math.round((Date.now() - startTime) / 1000);
        controller.enqueue(encode({ type: "complete", briefing, cached: false, elapsed: totalElapsed }));
      } catch (error) {
        const msg = error instanceof Error ? error.message : "알 수 없는 오류";
        const stack = error instanceof Error ? error.stack : "";
        console.error("브리핑 스트리밍 오류:", msg, stack);

        // 사용자에게 디버그 가능한 에러 메시지 전송
        let userMsg = `브리핑 생성 실패: ${msg}`;
        if (msg.includes("API key") || msg.includes("apiKey") || msg.includes("authentication")) {
          userMsg = "ANTHROPIC_API_KEY가 설정되지 않았거나 유효하지 않습니다.";
        } else if (msg.includes("JSON") || msg.includes("parse")) {
          userMsg = "AI 응답을 파싱하지 못했습니다. 다시 시도해주세요.";
        } else if (msg.includes("timeout") || msg.includes("ETIMEDOUT")) {
          userMsg = "AI 서버 응답 시간 초과. 다시 시도해주세요.";
        }

        try {
          controller.enqueue(encode({ type: "error", message: userMsg }));
        } catch {
          // 스트림 이미 닫힌 경우 무시
        }
      } finally {
        clearInterval(heartbeat);
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
