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
  getCompanyBatchDashboardData,
} from "@/lib/data";
import type { CompanyBriefing } from "@/types";
import {
  briefingResponseSchema,
  transformBriefingResponse,
  nullsToUndefined,
} from "@/lib/schemas";

// Vercel Pro 플랜: 최대 300초
export const maxDuration = 300;

interface BriefingRequest {
  companyId: string;
  force?: boolean;
}

// ══════════════════════════════════════════════════
// JSON 파싱 — 근본적 안정성 확보
// ══════════════════════════════════════════════════

/**
 * Claude 응답에서 JSON 추출 + 파싱 (다단계 복구)
 * 1단계: 직접 파싱
 * 2단계: 코드블록/텍스트 제거 후 파싱
 * 3단계: 잘린 JSON 복구 (미완성 문자열 처리 포함)
 */
function parseClaudeJson(raw: string, prefill: string): unknown {
  // prefill(예: "{")과 Claude 응답을 합쳐서 완전한 텍스트 만들기
  const fullText = (prefill + raw).trim();

  // 1단계: 직접 파싱 시도
  try {
    return JSON.parse(fullText);
  } catch {
    // 계속 진행
  }

  // 2단계: 마크다운 코드블록 등 제거 후 최외곽 {} 추출
  let cleaned = fullText;
  // 코드블록 제거
  cleaned = cleaned.replace(/^```(?:json)?\s*\n?/m, "").replace(/\n?```\s*$/m, "");

  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    const extracted = cleaned.slice(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(extracted);
    } catch {
      // 3단계로
    }
  }

  // 3단계: 잘린 JSON 복구
  console.warn("[브리핑] JSON 직접 파싱 실패, 잘린 JSON 복구 시도...");
  let jsonStr = firstBrace >= 0 ? cleaned.slice(firstBrace) : cleaned;

  // 미완성 문자열 값 닫기: 마지막 열린 "를 찾아서 닫기
  const quoteCount = (jsonStr.match(/(?<!\\)"/g) || []).length;
  if (quoteCount % 2 !== 0) {
    // 홀수개 = 문자열이 안 닫힘
    // 마지막 문자열 값을 잘라내고 닫기
    const lastQuote = jsonStr.lastIndexOf('"');
    // 마지막 따옴표 이후의 불완전한 텍스트를 제거하고 따옴표로 닫기
    const afterLastQuote = jsonStr.slice(lastQuote + 1);
    if (!afterLastQuote.includes("}") && !afterLastQuote.includes("]")) {
      jsonStr = jsonStr.slice(0, lastQuote + 1);
    } else {
      jsonStr += '"';
    }
  }

  // 마지막 완전한 key-value 쌍 이후에서 자르기
  // 불완전한 값(키만 있고 값이 없는 경우) 제거
  const lastCompleteComma = jsonStr.lastIndexOf(",");
  const lastCompleteColon = jsonStr.lastIndexOf(":");
  const lastCloseBrace = jsonStr.lastIndexOf("}");
  const lastCloseBracket = jsonStr.lastIndexOf("]");
  const lastComplete = Math.max(lastCloseBrace, lastCloseBracket);

  if (lastCompleteComma > lastComplete && lastCompleteComma > lastCompleteColon) {
    // 마지막 콤마 이후가 불완전한 항목이면 제거
    jsonStr = jsonStr.slice(0, lastCompleteComma);
  } else if (lastCompleteColon > lastComplete) {
    // 키는 있지만 값이 불완전한 경우, 해당 키-값 쌍 제거
    const keyStart = jsonStr.lastIndexOf('"', lastCompleteColon - 1);
    if (keyStart >= 0) {
      const beforeKey = jsonStr.lastIndexOf(",", keyStart);
      if (beforeKey >= 0) {
        jsonStr = jsonStr.slice(0, beforeKey);
      }
    }
  }

  // 열린 괄호를 모두 닫기
  let openBraces = 0, openBrackets = 0;
  let inString = false;
  let prevChar = "";
  for (const ch of jsonStr) {
    if (ch === '"' && prevChar !== "\\") inString = !inString;
    if (!inString) {
      if (ch === "{") openBraces++;
      if (ch === "}") openBraces--;
      if (ch === "[") openBrackets++;
      if (ch === "]") openBrackets--;
    }
    prevChar = ch;
  }
  jsonStr += "]".repeat(Math.max(0, openBrackets));
  jsonStr += "}".repeat(Math.max(0, openBraces));

  try {
    const result = JSON.parse(jsonStr);
    console.log("[브리핑] 잘린 JSON 복구 성공!");
    return result;
  } catch (e) {
    console.error("[브리핑] JSON 복구 최종 실패.", e);
    console.error("[브리핑] 마지막 300자:", jsonStr.slice(-300));
    throw new Error("JSON_PARSE_FAILED");
  }
}

/**
 * Claude 스트리밍 호출 + JSON 파싱 (1회 시도)
 * assistant prefill로 JSON 시작을 강제하여 마크다운/텍스트 혼입 원천 차단
 */
async function callClaudeAndParse(
  claude: ReturnType<typeof getClaudeClient>,
  systemPrompt: string,
  userPrompt: string,
  onProgress: (text: string) => void
): Promise<{ parsed: unknown; stopReason: string }> {
  // assistant prefill: Claude가 반드시 JSON으로 시작하도록 강제
  // 이 기법은 Claude 공식 문서에서 권장하는 structured output 보장 방법
  const JSON_PREFILL = "{";

  const response = await claude.messages.stream({
    model: process.env.BRIEFING_MODEL || "claude-haiku-4-5-20251001",
    // Sonnet 4.6은 상세한 응답을 생성하므로 넉넉하게 설정. 잘림 방지.
    max_tokens: 16384,
    system: [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }],
    messages: [
      { role: "user", content: userPrompt },
      { role: "assistant", content: JSON_PREFILL },
    ],
  });

  let fullText = "";
  let stopReason = "";

  for await (const event of response) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      fullText += event.delta.text;
      onProgress(fullText);
    }
    if (event.type === "message_delta") {
      stopReason = (event as unknown as { delta?: { stop_reason?: string } }).delta?.stop_reason || stopReason;
    }
  }

  if (stopReason === "max_tokens") {
    console.warn(`[브리핑] Claude 응답이 max_tokens에서 잘림! 텍스트 길이: ${fullText.length}자`);
  }

  console.log(`[브리핑] Claude 응답 길이: ${fullText.length}자, stopReason: ${stopReason}`);

  const parsed = parseClaudeJson(fullText, JSON_PREFILL);
  return { parsed, stopReason };
}

// ══════════════════════════════════════════════════
// SSE 스트리밍 브리핑 API
// ══════════════════════════════════════════════════

export async function POST(request: Request) {
  const encoder = new TextEncoder();

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
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encode({ type: "heartbeat" }));
        } catch {
          // 스트림이 이미 닫혔으면 무시
        }
      }, 3000);

      const startTime = Date.now();

      try {
        controller.enqueue(encode({ type: "heartbeat" }));

        // 0단계: 캐시 확인 (데이터 수집 전에 먼저 체크)
        if (!force) {
          const existing = await getBriefingByCompany(companyId);
          if (existing) {
            const [quickData, quickKpt, quickOkr] = await Promise.all([
              getCompanyAllData(companyId),
              getKptReviews(companyId),
              getOkrItems(companyId),
            ]);
            if (quickData) {
              const { stale } = isBriefingStale(existing, {
                sessions: quickData.sessions,
                expertRequests: quickData.expertRequests,
                analyses: quickData.analyses,
                kptCount: quickKpt.length,
                okrItemCount: quickOkr.length,
              });
              if (!stale) {
                controller.enqueue(encode({ type: "complete", briefing: existing, cached: true }));
                return;
              }
            }
          }
        }

        // 1단계: 데이터 수집
        controller.enqueue(encode({
          type: "status", step: 1, totalSteps: 3,
          message: "Notion에서 데이터를 가져오고 있어요",
          elapsed: 0,
        }));

        // 모든 데이터 수집을 병렬로 (batchData도 Promise.all에 포함)
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
        // batchData도 타임아웃 제한 + 실패 시 null (전체 흐름 차단 방지)
        const batchData = await Promise.race([
          getCompanyBatchDashboardData(company),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 8000)),
        ]).catch(() => null);

        // 데이터 수집 결과 요약 — 검토 볼륨을 구체적으로 표시
        const totalTextLength = sessions.reduce((sum, s) => sum + (s.summary?.length || 0), 0);
        const totalDocs = sessions.length + kptReviews.length + expertRequests.length + analyses.length + okrItems.length;
        const dateRange = sessions.length > 0
          ? `${sessions[sessions.length - 1]?.date?.slice(0, 7) || ""} ~ ${sessions[0]?.date?.slice(0, 7) || ""}`
          : "";

        const detailParts: string[] = [];
        detailParts.push(`문서 ${totalDocs}건`);
        if (totalTextLength > 0) detailParts.push(`약 ${Math.ceil(totalTextLength / 1000)}천자`);
        if (dateRange) detailParts.push(dateRange);
        const collectionDetail = `${detailParts.join(" · ")} 검토 중`;

        // 2단계: AI 분석
        controller.enqueue(encode({
          type: "status", step: 2, totalSteps: 3,
          message: "AI가 브리핑을 작성하고 있어요",
          detail: collectionDetail,
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
          kptReviews, okrItems, okrValues, batchData
        );

        // Claude 호출 + 자동 재시도 (최대 2회)
        let rawParsed: unknown;
        let lastError: Error | null = null;
        const MAX_ATTEMPTS = 2;

        for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
          try {
            if (attempt > 1) {
              console.log(`[브리핑] 재시도 ${attempt}/${MAX_ATTEMPTS}...`);
              controller.enqueue(encode({
                type: "status", step: 2, totalSteps: 3,
                message: `AI 응답 재시도 중 (${attempt}/${MAX_ATTEMPTS})`,
                elapsed: Math.round((Date.now() - startTime) / 1000),
              }));
            }

            let lastProgressSent = 0;
            const { parsed } = await callClaudeAndParse(
              claude, systemPrompt, userPrompt,
              (text) => {
                // 500자마다 진행률 업데이트
                if (text.length - lastProgressSent > 500) {
                  lastProgressSent = text.length;
                  const pct = Math.min(Math.round((text.length / 5000) * 90), 90);
                  try {
                    controller.enqueue(encode({
                      type: "progress", step: 2, totalSteps: 3,
                      message: "AI가 브리핑을 작성하고 있어요",
                      pct,
                      elapsed: Math.round((Date.now() - startTime) / 1000),
                    }));
                  } catch {
                    // 스트림 닫힌 경우 무시
                  }
                }
              }
            );

            rawParsed = parsed;
            lastError = null;
            break; // 성공하면 루프 종료
          } catch (e) {
            lastError = e instanceof Error ? e : new Error(String(e));
            console.warn(`[브리핑] 시도 ${attempt} 실패:`, lastError.message);
          }
        }

        if (lastError || !rawParsed) {
          throw lastError || new Error("AI 응답 파싱 실패");
        }

        // 3단계: 결과 처리
        const elapsed4 = Math.round((Date.now() - startTime) / 1000);
        controller.enqueue(encode({
          type: "status", step: 3, totalSteps: 3,
          message: "거의 다 됐어요!",
          elapsed: elapsed4,
        }));

        const validated = briefingResponseSchema.safeParse(nullsToUndefined(rawParsed));
        if (!validated.success) {
          console.error("스키마 검증 실패:", JSON.stringify(validated.error.issues.slice(0, 3)));
          // 스키마 검증 실패 시에도 가능한 데이터를 살려서 사용
          // partial parse: 검증 실패한 필드만 기본값으로 대체
          const lenient = briefingResponseSchema.safeParse(
            nullsToUndefined(stripInvalidFields(rawParsed, validated.error.issues))
          );
          if (lenient.success) {
            console.log("[브리핑] 부분 복구 성공 (일부 필드 기본값 적용)");
            const transformedSections = transformBriefingResponse(lenient.data);
            const briefing = buildBriefing(companyId, transformedSections, dataFingerprint);
            await safeSave(briefing);
            const totalElapsed = Math.round((Date.now() - startTime) / 1000);
            controller.enqueue(encode({ type: "complete", briefing, cached: false, elapsed: totalElapsed }));
            return;
          }
          // 최후의 보루: 부분 복구도 실패하면 가용한 데이터를 최대한 살림
          console.warn("[브리핑] 부분 복구도 실패. 최소 데이터로 브리핑 생성 시도...");
          console.warn("[브리핑] lenient 에러:", JSON.stringify(lenient.error.issues.slice(0, 3)));
          // rawParsed에서 최소한의 데이터라도 추출
          const fallback = briefingResponseSchema.safeParse({});
          if (fallback.success) {
            const transformedSections = transformBriefingResponse(fallback.data);
            const briefing = buildBriefing(companyId, transformedSections, dataFingerprint);
            briefing.errorMessage = "AI 응답 일부가 올바르지 않아 기본값으로 대체되었습니다. 다시 생성해주세요.";
            await safeSave(briefing);
            const totalElapsed = Math.round((Date.now() - startTime) / 1000);
            controller.enqueue(encode({ type: "complete", briefing, cached: false, elapsed: totalElapsed, partial: true }));
            return;
          }
          throw new Error("AI_FORMAT_ERROR");
        }

        const transformedSections = transformBriefingResponse(validated.data);
        const briefing = buildBriefing(companyId, transformedSections, dataFingerprint);
        await safeSave(briefing);

        const totalElapsed = Math.round((Date.now() - startTime) / 1000);
        controller.enqueue(encode({ type: "complete", briefing, cached: false, elapsed: totalElapsed }));
      } catch (error) {
        const msg = error instanceof Error ? error.message : "알 수 없는 오류";
        console.error("브리핑 스트리밍 오류:", msg);

        let userMsg = `브리핑 생성 중 문제가 발생했습니다. 다시 시도해주세요.`;
        if (msg.includes("API key") || msg.includes("apiKey") || msg.includes("authentication")) {
          userMsg = "ANTHROPIC_API_KEY가 설정되지 않았거나 유효하지 않습니다.";
        } else if (msg.includes("JSON") || msg.includes("parse") || msg.includes("PARSE") || msg.includes("FORMAT") || msg.includes("형식")) {
          userMsg = "AI 응답을 처리하지 못했습니다. '다시 시도' 버튼을 눌러주세요.";
        } else if (msg.includes("timeout") || msg.includes("ETIMEDOUT")) {
          userMsg = "AI 서버 응답 시간 초과. 다시 시도해주세요.";
        } else if (msg.includes("rate") || msg.includes("429")) {
          userMsg = "AI 서버가 바쁩니다. 잠시 후 다시 시도해주세요.";
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
      "Connection": "keep-alive",
      // Vercel Edge / Nginx 프록시의 응답 버퍼링 비활성화
      // SSE 스트림이 실시간으로 클라이언트에 전달되도록 보장
      "X-Accel-Buffering": "no",
    },
  });
}

// ── 헬퍼 함수 ──────────────────────────────────────

function buildBriefing(
  companyId: string,
  sections: ReturnType<typeof transformBriefingResponse>,
  dataFingerprint: CompanyBriefing["dataFingerprint"]
): CompanyBriefing {
  return {
    id: `briefing-${nanoid(8)}`,
    companyId,
    createdAt: new Date().toISOString(),
    status: "completed",
    ...sections,
    dataFingerprint,
  };
}

async function safeSave(briefing: CompanyBriefing) {
  try {
    await saveBriefing(briefing);
  } catch (e) {
    console.warn("브리핑 저장 실패 (무시):", e);
  }
}

/**
 * Zod 검증 실패한 필드를 제거하여 부분 복구 시도
 */
function stripInvalidFields(data: unknown, issues: { path: PropertyKey[] }[]): unknown {
  if (typeof data !== "object" || data === null) return data;
  const obj = { ...(data as Record<string, unknown>) };
  for (const issue of issues) {
    if (issue.path.length > 0) {
      const topKey = String(issue.path[0]);
      // 최상위 필드가 문제면 null로 대체 (optional 필드이므로 안전)
      if (issue.path.length === 1) {
        obj[topKey] = undefined;
      }
    }
  }
  return obj;
}
