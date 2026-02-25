// ── AI 타임라인 요약 API ──────────────────────────
// Claude Haiku로 타임라인 전체 항목을 한 번에 요약
// Progressive enhancement: 기본 텍스트 → AI 요약 교체
import { NextRequest, NextResponse } from "next/server";
import { getClaudeClient, classifyClaudeError } from "@/lib/claude";

interface TimelineEntry {
  index: number;
  date: string;
  title: string;
  category: string;
  rawText?: string;
}

interface AISummaryResult {
  index: number;
  summary: string;
}

export async function POST(request: NextRequest) {
  const t0 = Date.now();

  try {
    const { entries, companyName } = (await request.json()) as {
      entries: TimelineEntry[];
      companyName?: string;
    };

    if (!entries || entries.length === 0) {
      return NextResponse.json({ summaries: [] });
    }

    // rawText가 있는 항목만 AI 요약 대상
    const targetEntries = entries.filter((e) => e.rawText && e.rawText.length > 20);

    if (targetEntries.length === 0) {
      return NextResponse.json({ summaries: [] });
    }

    const client = getClaudeClient();

    // 전체 항목을 하나의 프롬프트로 배치 처리
    const entriesText = targetEntries
      .map(
        (e) =>
          `[${e.index}] ${e.date} | ${e.category} | ${e.title}\n원문:\n${e.rawText}`
      )
      .join("\n\n---\n\n");

    const prompt = `다음은 스타트업 "${companyName || "기업"}"의 멘토링/지원 활동 타임라인 원문입니다.
각 항목에 대해 **1~2문장의 완결된 요약**을 작성해주세요.

## 규칙
- 비전문가(문과생)도 바로 이해할 수 있는 쉬운 한국어로 작성
- "무엇이 논의되었고, 어떤 결론/결과/진행상황인지" 명확히 드러나게
- 문장이 중간에 끊기지 않도록 반드시 완결된 문장으로
- 각 요약은 30~80자 (한글 기준)
- 회의록 발췌가 아닌, 핵심을 이해하고 재서술
- 숫자/지표가 있으면 반드시 포함
- "~에 대해 논의함" 같은 뻔한 표현 대신 구체적 내용 서술
- 후속 조치가 중요하면 "→ 후속: ..." 형태로 한 줄 추가 가능

## 타임라인 원문

${entriesText}

## 응답 형식
JSON 배열만 출력하세요. 다른 텍스트 없이 순수 JSON만:
[{"index": 0, "summary": "요약 내용"}, ...]`;

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4000,
      messages: [{ role: "user", content: prompt }],
    });

    // 응답 파싱
    const text =
      response.content[0].type === "text" ? response.content[0].text : "";

    // JSON 추출 (코드블록 안에 있을 수 있음)
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.warn("[timeline-ai] JSON 파싱 실패:", text.slice(0, 200));
      return NextResponse.json({ summaries: [] });
    }

    const summaries: AISummaryResult[] = JSON.parse(jsonMatch[0]);

    console.log(
      `[perf] /api/timeline-ai: ${targetEntries.length}건 → ${Date.now() - t0}ms`
    );

    return NextResponse.json({ summaries });
  } catch (error) {
    console.error("[timeline-ai] error:", error);
    const message = classifyClaudeError(error);
    return NextResponse.json({ summaries: [], error: message }, { status: 200 });
    // status 200으로 반환 — 실패해도 기본 요약으로 fallback
  }
}
