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
      <Card className="transition-shadow hover:shadow-md cursor-pointer h-full">
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
            {summary?.keywords?.map((keyword) => (
              <Badge key={keyword} variant="secondary" className="text-xs">
                {keyword}
              </Badge>
            ))}
          </div>
          {topRisk && (
            <div className="flex items-center gap-2 text-xs">
              <span className="rounded-full px-2 py-0.5 font-medium bg-yellow-100 text-yellow-800">
                주의
              </span>
              <span className="text-muted-foreground truncate">
                {topRisk.title}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
