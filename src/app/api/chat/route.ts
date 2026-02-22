import { getClaudeClient } from "@/lib/claude";
import { buildChatSystemPrompt, buildChatContext } from "@/lib/chat-prompts";
import {
  getCompanyAllData,
  getBriefingByCompany,
  getKptReviews,
  getOkrItems,
  getOkrValues,
} from "@/lib/data";

// Vercel Pro 플랜: 최대 300초
export const maxDuration = 300;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatRequest {
  companyId: string;
  messages: ChatMessage[];
}

export async function POST(request: Request) {
  const encoder = new TextEncoder();

  function encode(data: object): Uint8Array {
    return encoder.encode(`data: ${JSON.stringify(data)}\n\n`);
  }

  const body = (await request.json()) as ChatRequest;
  const { companyId, messages } = body;

  if (!companyId || !messages?.length) {
    return Response.json(
      { success: false, error: "companyId와 messages는 필수입니다" },
      { status: 400 },
    );
  }

  const stream = new ReadableStream({
    async start(controller) {
      // heartbeat: 연결 유지 (3초마다)
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encode({ type: "heartbeat" }));
        } catch {
          // 스트림이 이미 닫혔으면 무시
        }
      }, 3000);

      try {
        controller.enqueue(encode({ type: "heartbeat" }));

        // 1. 기업 데이터 수집 (병렬)
        const [allData, kptReviews, okrItems, okrValues, existingBriefing] =
          await Promise.all([
            getCompanyAllData(companyId),
            getKptReviews(companyId),
            getOkrItems(companyId),
            getOkrValues(companyId),
            getBriefingByCompany(companyId),
          ]);

        if (!allData) {
          controller.enqueue(
            encode({ type: "error", message: "존재하지 않는 기업입니다" }),
          );
          return;
        }

        const { company, sessions, expertRequests } = allData;

        // 2. 시스템 프롬프트 조립
        const systemPrompt = buildChatSystemPrompt(company.name);
        const context = buildChatContext(
          company,
          sessions,
          expertRequests,
          kptReviews,
          okrItems,
          okrValues,
          existingBriefing,
        );

        const fullSystemPrompt = `${systemPrompt}\n\n[기업 컨텍스트 데이터]\n${context}`;

        // 3. Claude API 스트리밍 호출 (Sonnet 4.6 — prefill 없이)
        const claude = getClaudeClient();
        const model = process.env.CHAT_MODEL || process.env.BRIEFING_MODEL || "claude-haiku-4-5-20251001";

        const response = await claude.messages.stream({
          model,
          max_tokens: 4096,
          system: [
            {
              type: "text",
              text: fullSystemPrompt,
              cache_control: { type: "ephemeral" },
            },
          ],
          messages: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        });

        // 4. SSE 스트리밍 → 클라이언트
        for await (const event of response) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            try {
              controller.enqueue(
                encode({ type: "delta", text: event.delta.text }),
              );
            } catch {
              // 스트림 닫힌 경우 무시
              break;
            }
          }
        }

        // 완료 신호
        controller.enqueue(encode({ type: "done" }));
      } catch (error) {
        const msg = error instanceof Error ? error.message : "알 수 없는 오류";
        console.error("[chat] 스트리밍 오류:", msg);

        let userMsg = "답변 생성 중 문제가 발생했습니다. 다시 시도해주세요.";
        if (msg.includes("API key") || msg.includes("authentication")) {
          userMsg = "ANTHROPIC_API_KEY가 설정되지 않았거나 유효하지 않습니다.";
        } else if (msg.includes("rate") || msg.includes("429")) {
          userMsg = "AI 서버가 바쁩니다. 잠시 후 다시 시도해주세요.";
        } else if (msg.includes("timeout")) {
          userMsg = "AI 서버 응답 시간 초과. 다시 시도해주세요.";
        }

        try {
          controller.enqueue(encode({ type: "error", message: userMsg }));
        } catch {
          // 스트림 이미 닫힌 경우
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
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
