import { getClaudeClient, classifyClaudeError } from "@/lib/claude";
import { buildChatSystemPrompt, buildChatContext } from "@/lib/chat-prompts";
import { getBriefingByCompany } from "@/lib/data";
import {
  collectCompanyData,
  generatePulseReport,
  generateAnalystReport,
} from "@/lib/agents";

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

        // 1. 데이터 수집: collectCompanyData 1회로 통합 (기존 3중 fetch 제거)
        const [packet, existingBriefing] = await Promise.all([
          collectCompanyData(companyId),
          getBriefingByCompany(companyId),
        ]);

        if (!packet) {
          controller.enqueue(
            encode({ type: "error", message: "존재하지 않는 기업입니다" }),
          );
          return;
        }

        const { company, sessions, expertRequests, kptReviews, okrItems, okrValues, coachingRecords } = packet;

        // 2. PulseReport + AnalystReport 생성 (즉시 반환, AI 호출 없음)
        let agentContext = "";
        try {
          const pulse = generatePulseReport(packet);
          const analyst = generateAnalystReport(packet);
          agentContext = buildAgentContext(pulse, analyst);
        } catch {
          // 에이전트 실패 시 기존 컨텍스트만으로 진행
        }

        // 3. 시스템 프롬프트 조립
        const systemPrompt = buildChatSystemPrompt(company.name);
        const context = buildChatContext(
          company,
          sessions,
          expertRequests,
          kptReviews,
          okrItems,
          okrValues,
          existingBriefing,
          coachingRecords,
        );

        const fullSystemPrompt = `${systemPrompt}\n\n[기업 컨텍스트 데이터]\n${context}${agentContext}`;

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
        console.error("[chat] 스트리밍 오류:", error instanceof Error ? error.message : error);

        const userMsg = classifyClaudeError(error);

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

// ── PulseReport + AnalystReport → 채팅 컨텍스트 ──

import type { PulseReport, AnalystReport } from "@/lib/agents/types";

function buildAgentContext(pulse: PulseReport, analyst: AnalystReport): string {
  const parts: string[] = ["\n\n## 에이전트 분석 (Pulse + Analyst)"];

  // 정성적 종합 평가 (서술형)
  const qa = pulse.qualitativeAssessment;
  parts.push(`\n### 팀 종합 평가`);
  parts.push(qa.overallNarrative);

  parts.push(`\n### 멘토링 정기성`);
  parts.push(`- ${qa.mentoringRegularity.assessment}`);
  for (const m of qa.mentoringRegularity.recentMonthBreakdown) {
    parts.push(`  - ${m.month}: ${m.count}건`);
  }

  parts.push(`\n### 전담멘토 관계`);
  parts.push(`- ${qa.dedicatedMentorEngagement.assessment}`);

  parts.push(`\n### 전문가 리소스 활용`);
  parts.push(`- ${qa.expertRequestActivity.assessment}`);

  // 미팅 추세 (참고 맥락)
  parts.push(`\n### 미팅 현황`);
  parts.push(`- 총 ${pulse.meetingCadence.totalSessions}회 / ${pulse.meetingCadence.periodMonths}개월 / 평균 ${pulse.meetingCadence.avgIntervalDays}일 간격`);
  parts.push(`- 추세: ${pulse.meetingCadence.trendReason}`);

  if (pulse.healthSignals.length > 0) {
    parts.push(`\n### 주의 신호`);
    for (const s of pulse.healthSignals) {
      if (s.status !== "good") {
        parts.push(`- ${s.signal}: ${s.detail}`);
      }
    }
  }

  // Analyst 요약
  if (analyst.narrativeContext) {
    parts.push(`\n### Analyst 컨텍스트\n${analyst.narrativeContext}`);
  }

  if (analyst.topicAnalysis.topKeywords.length > 0) {
    parts.push(`\n### 주요 토픽: ${analyst.topicAnalysis.topKeywords.slice(0, 5).map((k) => `${k.keyword}(${k.count})`).join(", ")}`);
  }

  if (analyst.dataGaps.length > 0) {
    parts.push(`\n### 데이터 공백`);
    for (const g of analyst.dataGaps) {
      parts.push(`- [${g.severity}] ${g.area}: ${g.detail}`);
    }
  }

  return parts.join("\n");
}
