import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Company } from "@/types";

interface CompanyCardProps {
  company: Company;
  analysisCount?: number;
}

export function CompanyCard({ company, analysisCount = 0 }: CompanyCardProps) {
  return (
    <Link href={`/companies/${company.notionPageId}`}>
      <Card className="transition-shadow hover:shadow-md cursor-pointer h-full">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-lg">{company.name}</CardTitle>
              <CardDescription className="text-xs">
                {company.batchLabel || "배치 미지정"}
              </CardDescription>
            </div>
            {company.investmentStage && (
              <Badge variant="secondary">{company.investmentStage}</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {company.description || "기업 소개 없음"}
          </p>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-3">
              {company.industryNames?.[0] && (
                <span>{company.industryNames[0]}</span>
              )}
              {company.teamSize && <span>{company.teamSize}명</span>}
            </div>
            {analysisCount > 0 && (
              <span className="text-primary font-medium">
                분석 {analysisCount}건
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
