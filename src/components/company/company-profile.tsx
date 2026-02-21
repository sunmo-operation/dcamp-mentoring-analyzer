import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Company } from "@/types";

interface ExpertSummary {
  total: number;
  inProgress: number;
  completed: number;
}

interface CompanyProfileProps {
  company: Company;
  expertSummary?: ExpertSummary;
}

// 투자유치 현황 포맷: "Series A ₩50억" / "Series A" / "₩50억"
function formatInvestment(company: Company): string | null {
  const parts: string[] = [];
  if (company.investmentStage) parts.push(company.investmentStage);
  if (company.valuation) {
    const billions = company.valuation / 100_000_000;
    parts.push(billions >= 1 ? `₩${billions.toFixed(0)}억` : `₩${(company.valuation / 10_000).toFixed(0)}만`);
  }
  return parts.length > 0 ? parts.join(" ") : null;
}

// 비즈니스 중심 기업 프로필 카드
export function CompanyProfile({ company, expertSummary }: CompanyProfileProps) {
  // 배치 기간 포맷
  const batchPeriod =
    company.batchStartDate && company.batchEndDate
      ? `${company.batchStartDate} ~ ${company.batchEndDate}`
      : company.batchStartDate || null;

  // 핵심 비즈니스 지표 (값이 있는 것만 노출)
  const businessMetrics: { label: string; value: string }[] = [];
  if (company.investmentStage) businessMetrics.push({ label: "투자 단계", value: company.investmentStage });
  if (company.dealType?.length) businessMetrics.push({ label: "거래 유형", value: company.dealType.join(", ") });
  if (company.serviceType?.length) businessMetrics.push({ label: "서비스 유형", value: company.serviceType.join(", ") });
  if (company.marketSize) businessMetrics.push({ label: "시장 규모", value: company.marketSize });
  if (company.customerScaleRaw) businessMetrics.push({ label: "고객 규모", value: company.customerScaleRaw });
  if (company.growthStageRaw) businessMetrics.push({ label: "성장 단계", value: company.growthStageRaw });
  if (company.productMaturity) businessMetrics.push({ label: "제품 성숙도", value: company.productMaturity });
  if (company.techMaturity) businessMetrics.push({ label: "기술 성숙도", value: company.techMaturity });
  if (company.achievementRate !== undefined) businessMetrics.push({ label: "OKR 달성율", value: `${company.achievementRate}%` });

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

  const hasCompactInfo = metaParts.length > 0 || company.productIntro || company.yearMilestone;

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

        {/* 컴팩트 핵심 정보 (3줄 이내) */}
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
            {company.yearMilestone && (
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground/80">배치 목표</span>{" "}
                {company.yearMilestone}
              </p>
            )}
          </div>
        )}

        {/* 핵심 비즈니스 지표 */}
        {businessMetrics.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {businessMetrics.map(({ label, value }) => (
              <div key={label} className="rounded-2xl bg-muted p-4">
                <p className="text-xs text-muted-foreground mb-1">{label}</p>
                <p className="text-sm font-bold text-foreground">{value}</p>
              </div>
            ))}
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
