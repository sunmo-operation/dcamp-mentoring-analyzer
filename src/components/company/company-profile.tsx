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

export function CompanyProfile({ company, expertSummary }: CompanyProfileProps) {
  // 주요 정보를 key-value로 표시
  const metrics: { label: string; value: string }[] = [];
  if (company.teamSize) metrics.push({ label: "팀 규모", value: `${company.teamSize}명` });
  if (company.foundedDate) metrics.push({ label: "설립일", value: company.foundedDate });
  if (company.marketSize) metrics.push({ label: "시장 규모", value: company.marketSize });
  if (company.customerScaleRaw) metrics.push({ label: "고객 규모", value: company.customerScaleRaw });
  if (company.dealType?.length) metrics.push({ label: "거래 유형", value: company.dealType.join(", ") });
  if (company.serviceType?.length) metrics.push({ label: "서비스 유형", value: company.serviceType.join(", ") });

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle className="text-2xl">{company.name}</CardTitle>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {company.industryNames?.map((name) => (
              <Badge key={name}>{name}</Badge>
            ))}
            {company.investmentStage && (
              <Badge variant="secondary">{company.investmentStage}</Badge>
            )}
            {company.batchLabel && (
              <Badge variant="outline">{company.batchLabel}</Badge>
            )}
            {company.teamSize && (
              <Badge variant="outline">{company.teamSize}명</Badge>
            )}
          </div>

          {/* 전문가 요청 요약 */}
          {expertSummary && expertSummary.total > 0 && (
            <Link
              href={`/companies/${company.notionPageId}?tab=timeline&filter=expert_request`}
              className="mt-3 inline-flex items-center gap-2 rounded-lg border border-purple-200 bg-purple-50 px-3 py-1.5 text-sm transition-colors hover:bg-purple-100"
            >
              <span>🎓</span>
              <span className="font-medium text-purple-800">
                전문가 요청 {expertSummary.total}건
              </span>
              <span className="text-purple-600">
                (진행중 {expertSummary.inProgress} / 완료 {expertSummary.completed})
              </span>
            </Link>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground mb-4">
          {company.description || "기업 소개가 없습니다"}
        </p>
        {metrics.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {metrics.map(({ label, value }) => (
              <div key={label} className="rounded-lg border p-3 text-center">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="mt-1 text-lg font-semibold">{value}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
