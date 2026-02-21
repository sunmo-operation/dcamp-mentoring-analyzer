// ══════════════════════════════════════════════════
// db.ts — Vercel Postgres 저장소 (분석/브리핑 데이터)
// POSTGRES_URL 환경변수가 있을 때만 활성화
// ══════════════════════════════════════════════════
import { sql } from "@vercel/postgres";
import type { AnalysisResult, CompanyBriefing } from "@/types";
import { sanitizeForReact } from "@/lib/safe-render";

// ── 테이블 초기화 (앱 시작 시 1회) ────────────────
let initialized = false;

export async function ensureTables(): Promise<void> {
  if (initialized) return;

  await sql`
    CREATE TABLE IF NOT EXISTS analyses (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      data JSONB NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_analyses_company ON analyses(company_id)`;

  await sql`
    CREATE TABLE IF NOT EXISTS briefings (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      data JSONB NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_briefings_company ON briefings(company_id)`;

  initialized = true;
}

// ── Analyses ──────────────────────────────────────

export async function dbGetAnalyses(): Promise<AnalysisResult[]> {
  await ensureTables();
  const { rows } = await sql`SELECT data FROM analyses ORDER BY created_at DESC`;
  return rows.map((r) => sanitizeForReact(r.data as AnalysisResult));
}

export async function dbGetAnalysis(id: string): Promise<AnalysisResult | undefined> {
  await ensureTables();
  const { rows } = await sql`SELECT data FROM analyses WHERE id = ${id}`;
  const data = rows[0]?.data as AnalysisResult | undefined;
  return data ? sanitizeForReact(data) : undefined;
}

export async function dbGetAnalysesByCompany(companyId: string): Promise<AnalysisResult[]> {
  await ensureTables();
  const { rows } = await sql`
    SELECT data FROM analyses
    WHERE company_id = ${companyId}
    ORDER BY created_at DESC
  `;
  return rows.map((r) => sanitizeForReact(r.data as AnalysisResult));
}

export async function dbSaveAnalysis(analysis: AnalysisResult): Promise<void> {
  await ensureTables();
  const jsonData = JSON.stringify(analysis);
  await sql`
    INSERT INTO analyses (id, company_id, data)
    VALUES (${analysis.id}, ${analysis.companyId}, ${jsonData}::jsonb)
    ON CONFLICT (id) DO UPDATE SET data = ${jsonData}::jsonb
  `;
}

// ── Briefings ─────────────────────────────────────

export async function dbGetBriefings(): Promise<CompanyBriefing[]> {
  await ensureTables();
  const { rows } = await sql`SELECT data FROM briefings ORDER BY created_at DESC`;
  return rows.map((r) => sanitizeForReact(r.data as CompanyBriefing));
}

export async function dbGetBriefingByCompany(companyId: string): Promise<CompanyBriefing | undefined> {
  await ensureTables();
  const { rows } = await sql`
    SELECT data FROM briefings
    WHERE company_id = ${companyId}
    ORDER BY created_at DESC
    LIMIT 1
  `;
  const briefing = rows[0]?.data as CompanyBriefing | undefined;
  if (briefing && briefing.status === "completed") return sanitizeForReact(briefing);
  return undefined;
}

export async function dbSaveBriefing(briefing: CompanyBriefing): Promise<void> {
  await ensureTables();
  const jsonData = JSON.stringify(briefing);
  await sql`
    INSERT INTO briefings (id, company_id, data)
    VALUES (${briefing.id}, ${briefing.companyId}, ${jsonData}::jsonb)
    ON CONFLICT (id) DO UPDATE SET data = ${jsonData}::jsonb
  `;
}
