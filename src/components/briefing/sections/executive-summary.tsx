import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { momentumStyle } from "../briefing-styles";

interface ExecutiveSummaryProps {
  oneLiner: string;
  currentPhase: string;
  momentum: string;
  momentumReason: string;
  keyNumbers: string[];
}

// ── ① 경영진 요약 ────────────────────────────────
export function ExecutiveSummary({
  oneLiner,
  currentPhase,
  momentum,
  momentumReason,
  keyNumbers,
}: ExecutiveSummaryProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base">경영진 요약</CardTitle>
          <div className="flex items-center gap-2">
            <Badge className={momentumStyle[momentum]?.bg || momentumStyle.neutral.bg}>
              {momentumStyle[momentum]?.label || "보합"}
            </Badge>
            <Badge variant="outline">{currentPhase}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-base font-semibold leading-relaxed">
          {oneLiner}
        </p>
        <p className="text-xs text-muted-foreground">
          {momentumReason}
        </p>
        {keyNumbers.length > 0 && (
          <ul className="rounded-lg bg-muted/50 p-3 space-y-1">
            {keyNumbers.map((line, i) => (
              <li key={i} className="text-sm flex items-start gap-2">
                <span className="shrink-0 text-primary">&#8226;</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
