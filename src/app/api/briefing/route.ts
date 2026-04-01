import { nanoid } from "nanoid";
import { revalidatePath } from "next/cache";
import { getClaudeClient, classifyClaudeError } from "@/lib/claude";
import {
  getBriefingByCompany,
  saveBriefing,
  isBriefingStale,
} from "@/lib/data";
import { getLastEditedTime } from "@/lib/notion";
import type { CompanyBriefing } from "@/types";
import {
  briefingResponseSchema,
  transformBriefingResponse,
  nullsToUndefined,
} from "@/lib/schemas";
import {
  collectCompanyData,
  generateAnalystReport,
  generatePulseReport,
  buildEnhancedPrompts,
  analyzeSemanticTopics,
  mergeSemanticTopics,
  criticizeBriefing,
} from "@/lib/agents";
import type { AnalystReport } from "@/lib/agents";
import type { BriefingResponse } from "@/lib/schemas";

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
  const model = process.env.BRIEFING_MODEL || "claude-sonnet-4-6";

  // Sonnet 4.6+ 모델은 assistant prefill 미지원 → prefill 사용 불가
  const supportsPrefill = !model.includes("sonnet-4") && !model.includes("opus-4");
  const JSON_PREFILL = supportsPrefill ? "{" : "";

  const messages: { role: "user" | "assistant"; content: string }[] = [
    { role: "user", content: userPrompt },
  ];
  if (supportsPrefill) {
    messages.push({ role: "assistant", content: JSON_PREFILL });
  }

  const response = await claude.messages.stream({
    model,
    // Sonnet 4.6은 상세한 응답을 생성하므로 넉넉하게 설정. 잘림 방지.
    max_tokens: 16384,
    system: [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }],
    messages,
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

        // 1단계: 데이터 수집 (Agent: Data Collector)
        // stale 체크와 브리핑 생성 모두 같은 packet을 재사용
        controller.enqueue(encode({
          type: "status", step: 1, totalSteps: 4,
          message: "Notion에서 데이터를 가져오고 있어요",
          elapsed: 0,
        }));

        const [packet, existingBriefing, lastEdited] = await Promise.all([
          collectCompanyData(companyId),
          force ? Promise.resolve(undefined) : getBriefingByCompany(companyId),
          force ? Promise.resolve(null) : getLastEditedTime("company-detail", companyId),
        ]);

        if (!packet) {
          controller.enqueue(encode({ type: "error", message: "존재하지 않는 기업입니다" }));
          return;
        }

        // 0단계: 캐시 확인 (수집된 packet으로 stale 체크 — 별도 fetch 제거)
        if (!force && existingBriefing) {
          const { stale } = isBriefingStale(existingBriefing, {
            sessions: packet.sessions,
            expertRequests: packet.expertRequests,
            analyses: packet.analyses,
            lastEditedTime: lastEdited ?? undefined,
          });
          if (!stale) {
            controller.enqueue(encode({ type: "complete", briefing: existingBriefing, cached: true }));
            return;
          }
        }

        const { company, sessions, expertRequests, analyses } = packet;

        // 데이터 수집 결과 요약 — 검토 볼륨을 구체적으로 표시
        const totalTextLength = sessions.reduce((sum, s) => sum + (s.summary?.length || 0), 0);
        const slackCount = packet.slackMessages?.length || 0;
        const totalDocs = sessions.length + expertRequests.length + analyses.length + slackCount;
        const dateRange = sessions.length > 0
          ? `${sessions[sessions.length - 1]?.date?.slice(0, 7) || ""} ~ ${sessions[0]?.date?.slice(0, 7) || ""}`
          : "";

        const detailParts: string[] = [];
        detailParts.push(`문서 ${totalDocs}건`);
        if (totalTextLength > 0) detailParts.push(`약 ${Math.ceil(totalTextLength / 1000)}천자`);
        if (dateRange) detailParts.push(dateRange);
        const collectionDetail = `${detailParts.join(" · ")} 검토 중`;

        // 2단계: 분석 + AI 브리핑 (Agent: Analyst → Narrator)
        controller.enqueue(encode({
          type: "status", step: 2, totalSteps: 4,
          message: "AI가 브리핑을 작성하고 있어요",
          detail: collectionDetail,
        }));

        // Analyst Agent: 데이터 기반 사전 분석 (AI 호출 없음, 즉시 반환)
        let analystReport = generateAnalystReport(packet);

        // Topic Analyst (2차 에이전트) — getLastEditedTime은 위에서 이미 조회한 lastEdited 재사용
        const semanticTopics = await analyzeSemanticTopics(packet).catch(() => null);
        if (semanticTopics) {
          analystReport = mergeSemanticTopics(analystReport, semanticTopics);
        }

        const dataFingerprint: CompanyBriefing["dataFingerprint"] = {
          lastSessionDate: sessions[0]?.date || null,
          sessionCount: sessions.length,
          expertRequestCount: expertRequests.length,
          analysisCount: analyses.length,
          kptCount: 0,
          okrItemCount: 0,
          lastEditedTime: lastEdited ?? undefined,
        };

        // Pulse Tracker: 정성적 종합 평가 (즉시 반환, AI 호출 없음)
        const pulseReport = generatePulseReport(packet);

        // OKR 진단: Analyst 데이터에서 직접 매핑 (AI 호출 불필요, 환각 0%)
        const okrDiagnosisFromAnalyst = buildOkrDiagnosisFromAnalyst(analystReport, packet);

        // Narrator Agent: Analyst + Pulse 결과를 반영한 강화 프롬프트 생성
        const claude = getClaudeClient();
        const { systemPrompt, userPrompt } = buildEnhancedPrompts(packet, analystReport, pulseReport);

        // Claude 호출 + 자동 재시도 (최대 2회)
        let rawParsed: unknown;
        let lastError: Error | null = null;
        const MAX_ATTEMPTS = 2;

        for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
          try {
            if (attempt > 1) {
              console.log(`[브리핑] 재시도 ${attempt}/${MAX_ATTEMPTS}...`);
              controller.enqueue(encode({
                type: "status", step: 2, totalSteps: 4,
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
                      type: "progress", step: 2, totalSteps: 4,
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
            console.error(`[브리핑] 시도 ${attempt} 실패:`, lastError.message, lastError.stack);
            console.error(`[브리핑] 에러 상세:`, JSON.stringify(e, Object.getOwnPropertyNames(e as object), 2));
          }
        }

        if (lastError || !rawParsed) {
          throw lastError || new Error("AI 응답 파싱 실패");
        }

        // ── Critic Agent: 브리핑 품질 검증 ──────────────
        controller.enqueue(encode({
          type: "status", step: 3, totalSteps: 4,
          message: "브리핑 품질을 검증하고 있어요",
          elapsed: Math.round((Date.now() - startTime) / 1000),
        }));

        // 1차 브리핑을 Zod로 사전 파싱 (Critic에 타입 안전한 데이터 전달)
        const preValidated = briefingResponseSchema.safeParse(nullsToUndefined(rawParsed));
        if (preValidated.success) {
          try {
            const criticResult = await criticizeBriefing(preValidated.data, packet);
            console.log(`[Critic] 검증 완료: severity=${criticResult.severity}, issues=${criticResult.issues.length}건`);

            if (criticResult.severity === "critical" && criticResult.improvementPrompt) {
              // 2차 Claude 호출: 문제 섹션만 재생성
              controller.enqueue(encode({
                type: "status", step: 3, totalSteps: 4,
                message: "일부 섹션을 보강하고 있어요",
                elapsed: Math.round((Date.now() - startTime) / 1000),
              }));

              try {
                const patchPrompt = `기존 브리핑:\n${JSON.stringify(rawParsed, null, 2)}\n\n${criticResult.improvementPrompt}`;
                const { parsed: patchParsed } = await callClaudeAndParse(
                  claude, systemPrompt, patchPrompt, () => {} // 2차는 진행률 불필요
                );

                // 2차 결과를 1차에 머지
                if (patchParsed && typeof patchParsed === "object") {
                  rawParsed = { ...(rawParsed as Record<string, unknown>), ...(patchParsed as Record<string, unknown>) };
                  console.log("[Critic] 2차 재생성 결과 머지 완료");
                }
              } catch (e) {
                console.warn("[Critic] 2차 재생성 실패 (1차 결과 유지):", e);
              }
            }

            // warning 이슈를 metadata로 기록 (나중에 확인 가능)
            if (criticResult.issues.length > 0) {
              (rawParsed as Record<string, unknown>)._criticIssues = criticResult.issues.map((i) =>
                `[${i.type}] ${i.field}: ${i.message}`
              );
            }
          } catch (e) {
            console.warn("[Critic] 검증 실패 (무시, 1차 결과 진행):", e);
          }
        }

        // 4단계: 결과 처리
        const elapsed4 = Math.round((Date.now() - startTime) / 1000);
        controller.enqueue(encode({
          type: "status", step: 4, totalSteps: 4,
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
            const briefing = buildBriefing(companyId, transformedSections, dataFingerprint, okrDiagnosisFromAnalyst);
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
            const briefing = buildBriefing(companyId, transformedSections, dataFingerprint, okrDiagnosisFromAnalyst);
            briefing.errorMessage = "AI 응답 일부가 올바르지 않아 기본값으로 대체되었습니다. 다시 생성해주세요.";
            await safeSave(briefing);
            const totalElapsed = Math.round((Date.now() - startTime) / 1000);
            controller.enqueue(encode({ type: "complete", briefing, cached: false, elapsed: totalElapsed, partial: true }));
            return;
          }
          throw new Error("AI_FORMAT_ERROR");
        }

        const transformedSections = transformBriefingResponse(validated.data);
        const briefing = buildBriefing(companyId, transformedSections, dataFingerprint, okrDiagnosisFromAnalyst);
        await safeSave(briefing);

        const totalElapsed = Math.round((Date.now() - startTime) / 1000);
        controller.enqueue(encode({ type: "complete", briefing, cached: false, elapsed: totalElapsed }));
      } catch (error) {
        console.error("브리핑 스트리밍 오류:", error instanceof Error ? error.message : error);

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
  dataFingerprint: CompanyBriefing["dataFingerprint"],
  okrDiagnosisOverride?: CompanyBriefing["okrDiagnosis"]
): CompanyBriefing {
  return {
    id: `briefing-${nanoid(8)}`,
    companyId,
    createdAt: new Date().toISOString(),
    status: "completed",
    ...sections,
    // OKR 진단: AI 생성이 null이면 Analyst 데이터로 대체
    okrDiagnosis: sections.okrDiagnosis || okrDiagnosisOverride || null,
    dataFingerprint,
  };
}

async function safeSave(briefing: CompanyBriefing) {
  try {
    await saveBriefing(briefing);
    // ISR 캐시 무효화 — 다음 페이지 방문 시 저장된 브리핑을 즉시 반영
    revalidatePath(`/companies/${briefing.companyId}`);
  } catch (e) {
    console.warn("브리핑 저장 실패 (무시):", e);
  }
}

/**
 * Analyst가 계산한 OKR 데이터를 CompanyBriefing.okrDiagnosis에 직접 매핑
 * AI 호출 없이 환각 0%로 OKR 진단 제공
 */
function buildOkrDiagnosisFromAnalyst(
  analystReport: AnalystReport,
  packet: { kptReviews: { keep?: string; problem?: string; try?: string }[] }
): CompanyBriefing["okrDiagnosis"] {
  const { okrAnalysis } = analystReport;

  // OKR 데이터가 전혀 없으면 null 유지
  if (okrAnalysis.overallRate == null && okrAnalysis.objectives.length === 0) {
    return null;
  }

  // KPT 최근 1건 하이라이트
  const recentKpt = packet.kptReviews.length > 0
    ? {
        keep: packet.kptReviews[0]?.keep || "",
        problem: packet.kptReviews[0]?.problem || "",
        try: packet.kptReviews[0]?.try || "",
      }
    : null;

  // trendAnalysis: 데이터 기반 간단한 추세 서술
  let trendAnalysis = "";
  if (okrAnalysis.objectives.length > 0) {
    const achieved = okrAnalysis.objectives.filter((o) => o.achieved).length;
    const total = okrAnalysis.objectives.length;
    trendAnalysis = `${total}개 목표 중 ${achieved}개 달성`;
    if (okrAnalysis.hasGap && okrAnalysis.gapDetail) {
      trendAnalysis += ` (${okrAnalysis.gapDetail})`;
    }
  }

  return {
    overallRate: okrAnalysis.overallRate,
    objectives: okrAnalysis.objectives.map((o) => ({
      name: o.name,
      achievementRate: o.achievementRate ?? 0,
      achieved: o.achieved,
    })),
    trendAnalysis,
    metricVsNarrative: okrAnalysis.hasGap ? okrAnalysis.gapDetail || null : null,
    kptHighlights: recentKpt,
  };
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
