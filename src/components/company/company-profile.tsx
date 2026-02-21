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

// 토스 스타일 기업 프로필 카드
export function CompanyProfile({ company, expertSummary }: CompanyProfileProps) {
  // 배치 지원서 기준 정보 (배치 진입 시점의 데이터)
  const snapshotMetrics: { label: string; value: string }[] = [];
  if (company.teamSize) snapshotMetrics.push({ label: "팀 규모", value: `${company.teamSize}명` });
  if (company.foundedDate) snapshotMetrics.push({ label: "설립일", value: company.foundedDate });
  if (company.customerScaleRaw) snapshotMetrics.push({ label: "고객 규모", value: company.customerScaleRaw });

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle className="text-2xl">{company.name}</CardTitle>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {Array.isArray(company.industryNames) && company.industryNames.map((name, idx) => (
              <Badge key={typeof name === "string" ? name : idx}>{String(name)}</Badge>
            ))}
            {company.investmentStage && (
              <Badge variant="secondary">{String(company.investmentStage)}</Badge>
            )}
            {company.batchLabel && (
              <Badge variant="outline">{String(company.batchLabel)}</Badge>
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
      <CardContent>
        <p className="text-muted-foreground mb-6 leading-relaxed">
          {company.description || "기업 소개가 없습니다"}
        </p>

        {/* 배치 지원서 기준 데이터 — 명확히 시점을 표시 */}
        {snapshotMetrics.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-3">
              배치 지원서 기준
              {company.batchLabel ? ` (${company.batchLabel})` : ""}
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {snapshotMetrics.map(({ label, value }) => (
                <div key={label} className="rounded-2xl bg-muted p-4">
                  <p className="text-xs text-muted-foreground mb-1">{label}</p>
                  <p className="text-base font-bold text-foreground">{value}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
