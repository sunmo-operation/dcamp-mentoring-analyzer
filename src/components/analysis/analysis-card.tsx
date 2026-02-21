import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { AnalysisResult, Company } from "@/types";

interface AnalysisCardProps {
  analysis: AnalysisResult;
  company?: Company;
}

export function AnalysisCard({ analysis, company }: AnalysisCardProps) {
  const date = new Date(analysis.createdAt).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const summary = analysis.sections?.summary;
  const topRisk = analysis.sections?.riskSignals?.[0];

  return (
    <Link href={`/analyze/${analysis.id}`}>
      <Card className="cursor-pointer h-full hover:-translate-y-1 hover:shadow-[0_2px_8px_rgba(0,0,0,0.06),0_8px_24px_rgba(0,0,0,0.1)]">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div>
              <CardDescription className="text-xs">{date}</CardDescription>
              <CardTitle className="text-base mt-1">
                {summary?.oneLiner ?? analysis.topic ?? "분석 결과"}
              </CardTitle>
            </div>
            {company && (
              <Badge variant="outline" className="shrink-0">
                {company.name}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {Array.isArray(summary?.keywords) && summary.keywords.map((keyword, idx) => (
              <Badge key={typeof keyword === "string" ? keyword : idx} variant="secondary" className="text-xs">
                {typeof keyword === "string" ? keyword : String(keyword)}
              </Badge>
            ))}
          </div>
          {topRisk && (
            <div className="flex items-center gap-2 text-xs">
              <span className="rounded-full px-2.5 py-0.5 font-medium bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 text-[11px]">
                주의
              </span>
              <span className="text-muted-foreground truncate">
                {typeof topRisk.title === "string" ? topRisk.title : String(topRisk.title || "")}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
