import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { categoryStyle, urgencyLabel } from "../briefing-styles";

interface RepeatPattern {
  issue: string;
  issueCategory: string;
  firstSeen: string;
  occurrences: number;
  structuralCause: string;
  urgency: "high" | "medium" | "low";
}

interface RepeatPatternsProps {
  patterns: RepeatPattern[];
}

// ── ③ 심층 인사이트 ──────────────────────────────
export function RepeatPatterns({ patterns }: RepeatPatternsProps) {
  if (patterns.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">심층 인사이트</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {patterns.map((insight, i) => (
          <div
            key={i}
            className="rounded-2xl border-0 bg-muted/30 p-5 space-y-2"
          >
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={categoryStyle[insight.issueCategory] || "bg-gray-100 text-gray-800"}>
                {insight.issueCategory}
              </Badge>
              {insight.urgency && (
                <Badge variant={insight.urgency === "high" ? "destructive" : "outline"} className="text-xs">
                  {urgencyLabel[insight.urgency] || insight.urgency}
                </Badge>
              )}
              <span className="text-sm font-semibold">{insight.issue}</span>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {insight.structuralCause}
            </p>
            <p className="text-xs text-muted-foreground/70">
              근거: {insight.firstSeen}
              {insight.occurrences > 1 && ` / 관련 ${insight.occurrences}건`}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
