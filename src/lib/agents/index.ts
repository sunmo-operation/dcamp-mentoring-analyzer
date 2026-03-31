// ══════════════════════════════════════════════════
// Agent System — 에이전트 공개 API
// ══════════════════════════════════════════════════

export type { CompanyDataPacket, PulseReport, AnalystReport } from "./types";
export type { NarratorPrompts } from "./narrator";
export type { SemanticTopicResult } from "./topic-analyst";
export { collectCompanyData } from "./data-collector";
export { buildEnhancedPrompts } from "./narrator";
export { analyzeSemanticTopics, mergeSemanticTopics } from "./topic-analyst";

// ── 캐시 적용 래퍼 (PulseReport / AnalystReport) ──
// 동일 데이터(collectedAt 기준)에 대해 결정론적 결과를 반환하므로
// 15분 캐시로 중복 생성 방지

import type { CompanyDataPacket, PulseReport, AnalystReport } from "./types";
import { generatePulseReport as _genPulse } from "./pulse-tracker";
import { generateAnalystReport as _genAnalyst } from "./analyst";

const pulseCache = new Map<string, { data: PulseReport; expires: number }>();
const analystCache = new Map<string, { data: AnalystReport; expires: number }>();
const CACHE_TTL = 900_000; // 15분

function cacheKey(packet: CompanyDataPacket): string {
  return `${packet.company.notionPageId}:${packet.collectedAt}`;
}

export function generatePulseReport(packet: CompanyDataPacket): PulseReport {
  const key = cacheKey(packet);
  const cached = pulseCache.get(key);
  if (cached && cached.expires > Date.now()) return cached.data;

  const result = _genPulse(packet);
  pulseCache.set(key, { data: result, expires: Date.now() + CACHE_TTL });
  return result;
}

export function generateAnalystReport(packet: CompanyDataPacket): AnalystReport {
  const key = cacheKey(packet);
  const cached = analystCache.get(key);
  if (cached && cached.expires > Date.now()) return cached.data;

  const result = _genAnalyst(packet);
  analystCache.set(key, { data: result, expires: Date.now() + CACHE_TTL });
  return result;
}
