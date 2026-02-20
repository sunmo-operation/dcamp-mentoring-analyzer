import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AnalysisSummary } from "@/types";

interface Props {
  summary: AnalysisSummary;
}

export function SectionSummary({ summary }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">멘토링 요약</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-base font-medium mb-4">{summary.oneLiner}</p>
        <div className="flex flex-wrap gap-2">
          {summary.keywords.map((keyword) => (
            <Badge key={keyword} variant="secondary">
              {keyword}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
