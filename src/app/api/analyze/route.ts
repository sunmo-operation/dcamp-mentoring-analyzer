import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { getClaudeClient, classifyClaudeError } from "@/lib/claude";
import { buildSystemPrompt, buildUserPrompt } from "@/lib/prompts";
import {
  getCompany,
  saveAnalysis,
  getTimeline,
  getExpertRequests,
} from "@/lib/data";
import type { AnalyzeRequest, AnalysisResult } from "@/types";
import {
  analysisResponseSchema,
  transformAnalysisResponse,
  nullsToUndefined,
} from "@/lib/schemas";

// Vercel Pro 플랜 최대 실행 시간 설정 (300초)
// Claude AI 분석이 10초 이상 걸리므로 필요
export const maxDuration = 300;

export async function POST(request: Request) {
  let analysis: AnalysisResult | null = null;

  try {
    const body = (await request.json()) as AnalyzeRequest;
    const { companyId, transcript, mentorName, topic, mentoringDate, sessionId } = body;

    // 유효성 검증
    if (!companyId || !transcript?.trim()) {
      return NextResponse.json(
        { success: false, error: "기업 ID와 멘토링 원문은 필수입니다" },
        { status: 400 }
      );
    }

    // 입력 길이 상한 검증 (Claude API 토큰 한도 + 비용 방어)
    if (transcript.length > 100_000) {
      return NextResponse.json(
        { success: false, error: "멘토링 원문이 너무 깁니다 (최대 100,000자)" },
        { status: 400 }
      );
    }

    const company = await getCompany(companyId);
    if (!company) {
      return NextResponse.json(
        { success: false, error: "존재하지 않는 기업입니다" },
        { status: 404 }
      );
    }

    // 컨텍스트 자동 수집 (타임라인 + 전문가 요청)
    const [timeline, expertRequests] = await Promise.all([
      getTimeline(companyId),
      getExpertRequests(companyId),
    ]);

    // 분석 ID 생성 + 초기 상태 저장
    const analysisId = `analysis-${nanoid(8)}`;
    analysis = {
      id: analysisId,
      companyId,
      sessionId: sessionId || undefined,
      createdAt: new Date().toISOString(),
      status: "analyzing",
      source: "notion",
      inputText: transcript,
      contextSummary: timeline.length > 0 || expertRequests.length > 0
        ? `타임라인 ${timeline.length}건, 전문가 요청 ${expertRequests.length}건 반영`
        : undefined,
      sections: {
        summary: null,
        surfaceIssues: null,
        rootChallenges: null,
        recommendedActions: null,
        riskSignals: null,
      },
      mentorName: mentorName || "미지정",
      topic: topic || "일반 멘토링",
      mentoringDate: mentoringDate || new Date().toISOString().split("T")[0],
    };

    // Claude API 호출 (시스템 프롬프트에 기업 컨텍스트 주입)
    const claude = getClaudeClient();
    const systemPrompt = buildSystemPrompt(company, { timeline, expertRequests });
    const userPrompt = buildUserPrompt(
      transcript,
      analysis.mentorName!,
      analysis.topic!,
      analysis.mentoringDate!
    );

    const message = await claude.messages.create({
      model: process.env.ANALYSIS_MODEL || "claude-haiku-4-5-20251001",
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
    const validated = analysisResponseSchema.safeParse(nullsToUndefined(rawParsed));
    if (!validated.success) {
      console.error("Claude 응답 스키마 검증 실패:", validated.error.format());
      throw new Error(`AI 응답 형식 오류: ${validated.error.issues[0]?.message || "알 수 없는 형식"}`);
    }

    analysis.status = "completed";
    analysis.sections = transformAnalysisResponse(validated.data);

    await saveAnalysis(analysis);

    return NextResponse.json({ success: true, analysisId });
  } catch (error) {
    console.error("분석 오류:", error);

    const errorMessage =
      error instanceof Error ? error.message : "알 수 없는 오류";

    // analyzing 상태로 저장된 레코드를 failed로 업데이트
    if (analysis && analysis.status === "analyzing") {
      analysis.status = "failed";
      analysis.errorMessage = errorMessage;
      try {
        await saveAnalysis(analysis);
      } catch {
        console.error("실패 상태 저장 중 오류");
      }
    }

    const userMsg = classifyClaudeError(error);

    return NextResponse.json(
      { success: false, error: userMsg },
      { status: 500 }
    );
  }
}
