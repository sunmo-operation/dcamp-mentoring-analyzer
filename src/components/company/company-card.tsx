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

// 토스 스타일 기업 카드: 호버 시 살짝 떠오르는 효과 + 넉넉한 여백
export function CompanyCard({ company, analysisCount = 0 }: CompanyCardProps) {
  return (
    <Link
      href={`/companies/${company.notionPageId}`}
      onClick={() => {
        // 네비게이션 시작 타이밍 기록 (dev 콘솔에서 성능 측정용)
        if (typeof performance !== "undefined") {
          performance.mark("nav-start");
          console.log(`[perf] 네비게이션 시작: ${company.name} (${new Date().toISOString()})`);
        }
      }}
    >
      <Card className="cursor-pointer h-full hover:-translate-y-1 hover:shadow-[0_2px_8px_rgba(0,0,0,0.06),0_8px_24px_rgba(0,0,0,0.1)]">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <CardTitle className="text-lg truncate">{company.name}</CardTitle>
              <CardDescription className="text-xs mt-1">
                {company.ceoName && <span className="text-foreground/70">대표 {company.ceoName} · </span>}
                {company.batchLabel || "배치 미지정"}
              </CardDescription>
            </div>
            {company.investmentStage && (
              <Badge variant="secondary" className="shrink-0">
                {company.investmentStage}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground line-clamp-2 mb-4 leading-relaxed">
            {company.description || "기업 소개 없음"}
          </p>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-3">
              {company.industryNames?.[0] && (
                <span className="bg-muted px-2 py-0.5 rounded-md">{company.industryNames[0]}</span>
              )}
              {company.teamSize && <span>{company.teamSize}명</span>}
            </div>
            {analysisCount > 0 && (
              <span className="text-primary font-semibold">
                분석 {analysisCount}건
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
