import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { getClaudeClient } from "@/lib/claude";
import { buildSystemPrompt, buildUserPrompt } from "@/lib/prompts";
import {
  getCompany,
  saveAnalysis,
  getTimeline,
  getExpertRequests,
} from "@/lib/data";
import type { AnalyzeRequest, AnalysisResult } from "@/types";

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
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    // 응답에서 텍스트 추출
    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("Claude 응답에서 텍스트를 찾을 수 없습니다");
    }

    // JSON 파싱 (마크다운 코드블록 제거 대응)
    let jsonStr = textBlock.text.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    const parsed = JSON.parse(jsonStr);

    // Claude 응답을 새 타입 구조로 매핑 (STEP 7에서 프롬프트 자체를 개선 예정)
    analysis.status = "completed";
    analysis.sections = {
      summary: parsed.summary
        ? {
            oneLiner: parsed.summary.oneLiner,
            keywords: parsed.summary.keyTopics || parsed.summary.keywords || [],
          }
        : null,
      surfaceIssues: parsed.surfaceIssues?.map(
        (s: { statement?: string; title?: string; context?: string; description?: string }) => ({
          title: s.statement || s.title || "",
          description: s.context || s.description || "",
        })
      ) ?? null,
      rootChallenges: parsed.rootCauses?.map(
        (r: { title: string; description: string; severity: string; category: string; evidence?: string; structuralCause?: string }) => ({
          title: r.title,
          description: r.description,
          severity: r.severity,
          category: r.category,
          structuralCause: r.evidence || r.structuralCause || "",
        })
      ) ?? null,
      recommendedActions: parsed.recommendedActions ?? null,
      riskSignals: parsed.riskSignals?.map(
        (r: { signal?: string; title?: string; type?: string; description?: string; severity?: string; mitigation?: string; response?: string; pattern?: string }) => ({
          title: r.signal || r.title || "",
          description: r.type ? `[${r.type}] ${r.severity || ""}` : (r.description || ""),
          pattern: r.pattern,
          response: r.mitigation || r.response || "",
        })
      ) ?? null,
    };

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
          ? `분석 실패: ${errorMessage}`
          : "분석 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
      },
      { status: 500 }
    );
  }
}
