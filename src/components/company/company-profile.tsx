import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Company, KptReview } from "@/types";

interface ExpertSummary {
  total: number;
  inProgress: number;
  completed: number;
}

interface CompanyProfileProps {
  company: Company;
  expertSummary?: ExpertSummary;
  kptSummary?: string; // AI 요약된 최근 KPT 회고
  kptCount?: number; // 원본 KPT 건수
}

// 금액을 억원 단위로 변환 (100,000,000원 → 1억원)
function formatWon(value: number): string {
  const billions = value / 100_000_000;
  if (billions >= 1) return `${billions % 1 === 0 ? billions.toFixed(0) : billions.toFixed(1)}억원`;
  if (value >= 10_000) return `${(value / 10_000).toFixed(0)}만원`;
  return `${value.toLocaleString()}원`;
}

// 문자열 내 모든 금액을 억원 단위로 자동 변환
// 엑셀 원본의 다양한 포맷을 처리:
// - 순수 숫자: "2800000000.0" → "28억원"
// - 콤마 숫자: "6,000,000,000" → "60억원"
// - 원 단위: "5,679,998,232 원" → "56.8억원"
// - 이미 억: "170억" → "170억원"
function formatMoneyStr(text: string): string {
  const trimmed = text.trim();

  // Case 1: 순수 숫자 문자열 (예: "2800000000.0", "15000000000.0")
  if (/^[\d,.]+$/.test(trimmed)) {
    const val = parseFloat(trimmed.replace(/,/g, ""));
    if (!isNaN(val) && val >= 10_000_000) return formatWon(val);
    // ".0" 엑셀 변환 아티팩트 제거
    if (trimmed.endsWith(".0")) return trimmed.replace(/\.0$/, "");
    return trimmed;
  }

  let result = text;

  // Case 2: "100억 원" → "100억원" (공백 통합)
  result = result.replace(/억\s+원/g, "억원");

  // Case 3: "숫자원" / "숫자 원" → 억원 변환 (1000만 이상만)
  result = result.replace(/(\d[\d,]*)(\s*)원/g, (full, num) => {
    const val = parseInt(num.replace(/,/g, ""), 10);
    if (isNaN(val) || val < 10_000_000) return full;
    return formatWon(val);
  });

  // Case 4: "50억" → "50억원" (원 누락 보정)
  result = result.replace(/(\d+(?:\.\d+)?)억(?!원)/g, "$1억원");

  // Case 5: 텍스트 내 콤마 포함 대형 숫자 (1억+) → 억원
  result = result.replace(/(\d{1,3}(?:,\d{3}){2,})(?:\.\d+)?(?![\d억만원])/g, (match) => {
    const val = parseFloat(match.replace(/,/g, ""));
    if (isNaN(val) || val < 100_000_000) return match;
    return formatWon(val);
  });

  // Case 6: 텍스트 내 콤마 없는 대형 숫자 (9자리+, 10억+) → 억원
  result = result.replace(/(?<![.\d])(\d{9,})(?:\.\d+)?(?![\d억만원])/g, (match) => {
    const val = parseFloat(match);
    if (isNaN(val) || val < 100_000_000) return match;
    return formatWon(val);
  });

  return result;
}

// 투자유치 현황 포맷: "Series A 50억원" / "Series A" / "50억원"
function formatInvestment(company: Company): string | null {
  const parts: string[] = [];
  if (company.investmentStage) parts.push(company.investmentStage);
  if (company.valuation) parts.push(formatWon(company.valuation));
  return parts.length > 0 ? parts.join(" ") : null;
}

// 비즈니스 중심 기업 프로필 카드
export function CompanyProfile({ company, expertSummary, kptSummary, kptCount }: CompanyProfileProps) {
  // 배치 기간 포맷
  const batchPeriod =
    company.batchStartDate && company.batchEndDate
      ? `${company.batchStartDate} ~ ${company.batchEndDate}`
      : company.batchStartDate || null;

  // 팀 기본 정보 (보조 정보로 하단에 배치)
  const teamInfo: string[] = [];
  if (company.teamSize) teamInfo.push(`${company.teamSize}명`);
  if (company.website) teamInfo.push(company.website);

  // 컴팩트 메타라인: 대표자 · 설립일 · 투자유치
  const metaParts: string[] = [];
  if (company.ceoName) metaParts.push(`${company.ceoName} 대표`);
  if (company.foundedDate) {
    const year = company.foundedDate.slice(0, 4);
    const month = company.foundedDate.slice(5, 7);
    metaParts.push(`${year}.${month} 설립`);
  }
  const investment = formatInvestment(company);
  if (investment) metaParts.push(investment);

  const hasCompactInfo = metaParts.length > 0 || company.productIntro;

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle className="text-2xl">{company.name}</CardTitle>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {Array.isArray(company.industryNames) && company.industryNames.map((name, idx) => (
              <Badge key={typeof name === "string" ? name : idx}>{String(name)}</Badge>
            ))}
            {company.batchLabel && (
              <Badge variant="outline">
                {String(company.batchLabel)}
                {batchPeriod && <span className="ml-1 text-muted-foreground font-normal">({batchPeriod})</span>}
              </Badge>
            )}
          </div>

          {/* 전문가 요청 요약 */}
          {expertSummary && expertSummary.total > 0 && (
            <Link
              href={`/companies/${company.notionPageId}?tab=timeline&filter=expert_request`}
              className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-secondary px-4 py-2 text-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)]"
            >
              <span className="text-primary font-semibold">
                전문가 요청 {expertSummary.total}건
              </span>
              <span className="text-muted-foreground">
                (진행중 {expertSummary.inProgress} / 완료 {expertSummary.completed})
              </span>
            </Link>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* 기업 소개 */}
        <p className="text-muted-foreground leading-relaxed">
          {company.description || "기업 소개가 없습니다"}
        </p>

        {/* Executive Snapshot — 배치 지원 시점 기준 데이터 */}
        {company.executiveSnapshot ? (
          <div className="rounded-xl border border-primary/20 bg-primary/[0.03] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                <p className="text-xs font-bold text-primary tracking-wide uppercase">Executive Snapshot</p>
              </div>
              <span className="text-[10px] text-muted-foreground/60">배치 지원 당시 기준</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SnapshotField label="대표자" value={company.executiveSnapshot.ceoName} />
              <SnapshotField label="제품/서비스" value={company.executiveSnapshot.productSummary} />
              <SnapshotField label="투자 단계 (지원 당시)" value={company.executiveSnapshot.investmentSummary} />
              <SnapshotField label="배치 핵심 목표" value={company.executiveSnapshot.batchGoal} />
              <SnapshotField label="핵심 차별성" value={company.executiveSnapshot.moat} />
              <SnapshotField label="이상적 성공 모습" value={company.executiveSnapshot.idealVision} />
            </div>
          </div>
        ) : company.excel?.survey && (
          <div className="rounded-xl border border-primary/20 bg-primary/[0.03] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                <p className="text-xs font-bold text-primary tracking-wide uppercase">Executive Snapshot</p>
              </div>
              <span className="text-[10px] text-muted-foreground/60">배치 지원 당시 기준</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SnapshotField label="대표자" value={company.ceoName || company.excel.pmPrimary || ""} />
              <SnapshotField label="제품/서비스" value={company.excel.survey.productIntro?.slice(0, 80) || ""} />
              <SnapshotField label="투자 단계 (지원 당시)" value={company.excel.survey.investmentStatus?.slice(0, 80) || (company.investmentStage || "")} />
              <SnapshotField label="배치 핵심 목표" value={company.excel.survey.yearGoal?.slice(0, 80) || ""} />
              <SnapshotField label="핵심 차별성" value={company.excel.survey.moat?.slice(0, 80) || ""} />
              <SnapshotField label="이상적 성공 모습" value={company.excel.survey.idealSuccess?.slice(0, 80) || ""} />
            </div>
          </div>
        )}

        {/* 컴팩트 핵심 정보 */}
        {hasCompactInfo && (
          <div className="rounded-xl bg-muted/50 px-4 py-3 space-y-1.5">
            {metaParts.length > 0 && (
              <p className="text-sm text-muted-foreground">
                {metaParts.join(" · ")}
              </p>
            )}
            {company.productIntro && (
              <p className="text-sm font-medium text-foreground">
                {company.productIntro}
              </p>
            )}
          </div>
        )}

        {/* 팀의 회고 (최근 KPT 요약) */}
        {kptSummary && (
          <div className="rounded-xl border border-border/60 px-4 py-3 space-y-1">
            <div className="flex items-center gap-2">
              <p className="text-xs font-semibold text-muted-foreground">팀의 회고</p>
              {kptCount && kptCount > 0 && (
                <span className="text-[10px] text-muted-foreground/60">최근 {kptCount}건 기반</span>
              )}
            </div>
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">
              {kptSummary}
            </p>
          </div>
        )}

        {/* 담당자 정보 (엑셀 마스터 시트) */}
        {company.excel && (company.excel.pmPrimary || company.excel.dedicatedMentor) && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {company.excel.pmPrimary && (
              <div className="rounded-2xl bg-blue-50 dark:bg-blue-950/30 p-4">
                <p className="text-xs text-muted-foreground mb-1">PM (정)</p>
                <p className="text-sm font-bold text-foreground">{company.excel.pmPrimary}</p>
                {company.excel.pmSecondary && (
                  <p className="text-xs text-muted-foreground mt-0.5">부: {company.excel.pmSecondary}</p>
                )}
              </div>
            )}
            {company.excel.dedicatedMentor && (
              <div className="rounded-2xl bg-blue-50 dark:bg-blue-950/30 p-4">
                <p className="text-xs text-muted-foreground mb-1">전담 멘토</p>
                <p className="text-sm font-bold text-foreground">{company.excel.dedicatedMentor}</p>
              </div>
            )}
            {company.excel.expertMentor && (
              <div className="rounded-2xl bg-blue-50 dark:bg-blue-950/30 p-4">
                <p className="text-xs text-muted-foreground mb-1">전문가 멘토</p>
                <p className="text-sm font-bold text-foreground">{company.excel.expertMentor}</p>
              </div>
            )}
            {company.excel.email && (
              <div className="rounded-2xl bg-blue-50 dark:bg-blue-950/30 p-4">
                <p className="text-xs text-muted-foreground mb-1">연락처</p>
                <p className="text-sm font-bold text-foreground truncate">{company.excel.email}</p>
                {company.excel.phone && (
                  <p className="text-xs text-muted-foreground mt-0.5">{company.excel.phone}</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* 투자현황 상세 (엑셀 마스터 시트) */}
        {company.excel?.investment && (
          <div className="rounded-xl border border-border/60 px-4 py-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground">투자 현황 상세</p>
              <span className="text-[10px] text-muted-foreground/50">배치 지원 당시 기준</span>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
              {company.excel.investment.latestRound && (
                <div><span className="text-muted-foreground">최근 라운드:</span> <span className="font-medium">{company.excel.investment.latestRound}</span></div>
              )}
              {company.excel.investment.preMoneyValuation && (
                <div><span className="text-muted-foreground">Pre-money:</span> <span className="font-medium">{formatMoneyStr(company.excel.investment.preMoneyValuation)}</span></div>
              )}
              {company.excel.investment.cumulativeFunding && (
                <div><span className="text-muted-foreground">누적 투자:</span> <span className="font-medium">{formatMoneyStr(company.excel.investment.cumulativeFunding)}</span></div>
              )}
              {company.excel.investment.leadInvestor && (
                <div><span className="text-muted-foreground">리드 투자자:</span> <span className="font-medium">{company.excel.investment.leadInvestor}</span></div>
              )}
              {company.excel.investment.nextRound && (
                <div><span className="text-muted-foreground">다음 라운드:</span> <span className="font-medium">{company.excel.investment.nextRound}</span></div>
              )}
              {company.excel.investment.revenue2025 && (
                <div><span className="text-muted-foreground">&apos;25 결산:</span> <span className="font-medium">{company.excel.investment.revenue2025}억원</span></div>
              )}
            </div>
          </div>
        )}

        {/* 팀 기본 정보 — 보조 라인 */}
        {teamInfo.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {teamInfo.join(" · ")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ── Executive Snapshot 개별 필드 ──────────────
function SnapshotField({ label, value }: { label: string; value: string }) {
  if (!value || value === "확인 필요") return null;
  return (
    <div className="space-y-0.5">
      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="text-sm font-medium text-foreground leading-snug">{value}</p>
    </div>
  );
}
