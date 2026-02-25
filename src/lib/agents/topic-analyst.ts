// ══════════════════════════════════════════════════
// ⑤ Topic Analyst Agent (2차 에이전트)
// Claude Haiku를 활용한 의미론적 토픽 클러스터링
// - 키워드 기반 분석의 한계를 보완
// - 세션 텍스트에서 실제 주제/맥락을 추출
// - 기존 AnalystReport.topicAnalysis를 enrichment
// ══════════════════════════════════════════════════

import { getClaudeClient } from "@/lib/claude";
import type { CompanyDataPacket, AnalystReport } from "./types";

/**
 * 의미론적 토픽 클러스터링 결과
 */
export interface SemanticTopicResult {
  clusters: {
    topic: string; // 토픽 이름 (예: "채용 및 조직 확장")
    sessions: string[]; // 관련 세션 날짜
    keywords: string[]; // 관련 키워드
    summary: string; // 한 줄 설명
  }[];
  recentNarrative: string; // 최근 3회 세션의 맥락 요약
  evolution: string; // 토픽 변화 흐름 (초기→현재)
}

// 인메모리 캐시 (30분 TTL)
const topicCache = new Map<string, { data: SemanticTopicResult; expires: number }>();

/**
 * 세션 텍스트를 Claude Haiku로 분석하여 의미론적 토픽 클러스터 추출
 * 실패 시 null 반환 (기존 키워드 분석이 fallback)
 */
export async function analyzeSemanticTopics(
  packet: CompanyDataPacket
): Promise<SemanticTopicResult | null> {
  const { sessions, company } = packet;
  if (sessions.length < 3) return null; // 최소 3건 이상일 때만 의미 있음

  // 캐시 확인
  const cacheKey = `topics:${company.notionPageId}:${sessions.length}`;
  const cached = topicCache.get(cacheKey);
  if (cached && cached.expires > Date.now()) return cached.data;

  // 세션 텍스트 준비 (최근 20건, 토큰 절약)
  const sorted = [...sessions]
    .filter((s) => s.date)
    .sort((a, b) => b.date.localeCompare(a.date));
  const target = sorted.slice(0, 20);

  const sessionTexts = target.map((s, i) => {
    const parts: string[] = [`[${i + 1}] ${s.date}`];
    if (s.title) parts.push(`제목: ${s.title}`);
    if (s.sessionTypes.length > 0) parts.push(`유형: ${s.sessionTypes.join(", ")}`);
    if (s.summary) parts.push(`내용: ${s.summary.slice(0, 200)}`);
    if (s.followUp) parts.push(`후속조치: ${s.followUp.slice(0, 150)}`);
    return parts.join("\n");
  }).join("\n---\n");

  try {
    const client = getClaudeClient();
    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 800,
      messages: [{
        role: "user",
        content: `스타트업 액셀러레이터 PM으로서, 아래 ${company.name}의 멘토링 세션 ${target.length}건을 분석하여 의미론적 토픽 클러스터를 추출하세요.

## 규칙
- 3~5개의 토픽 클러스터로 분류
- 각 클러스터: 토픽명(10자 이내), 관련 세션 날짜, 핵심 키워드 3~5개, 한줄 설명
- recentNarrative: 최근 3회 세션의 핵심 맥락을 2문장으로
- evolution: 초기→현재 토픽 변화 흐름을 1문장으로
- 맥킨지 톤: 정량적, 팩트 기반, 간결체

## 세션 데이터
${sessionTexts}

## 출력 (JSON만)
{"clusters":[{"topic":"토픽명","sessions":["2025-01-15"],"keywords":["키워드"],"summary":"설명"}],"recentNarrative":"최근 맥락","evolution":"변화 흐름"}`,
      }],
    });

    const text = msg.content[0].type === "text" ? msg.content[0].text : "";
    const json = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || "{}");

    const result: SemanticTopicResult = {
      clusters: (json.clusters || []).slice(0, 5),
      recentNarrative: json.recentNarrative || "",
      evolution: json.evolution || "",
    };

    topicCache.set(cacheKey, { data: result, expires: Date.now() + 1_800_000 });
    return result;
  } catch (error) {
    console.warn("[TopicAnalyst] 의미론적 토픽 분석 실패:", error);
    return null;
  }
}

/**
 * AnalystReport의 topicAnalysis에 의미론적 분석 결과를 병합
 * 기존 키워드 분석은 유지하고, semantic 필드를 추가
 */
export function mergeSemanticTopics(
  report: AnalystReport,
  semantic: SemanticTopicResult
): AnalystReport {
  return {
    ...report,
    topicAnalysis: {
      ...report.topicAnalysis,
      semanticClusters: semantic.clusters,
      recentNarrative: semantic.recentNarrative,
      topicEvolution: semantic.evolution,
    },
  };
}
