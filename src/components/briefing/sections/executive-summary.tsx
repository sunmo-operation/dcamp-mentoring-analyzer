import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { momentumStyle } from "../briefing-styles";
import { safeStr } from "@/lib/safe-render";

// PMF 단계 스타일
const pmfStyle: Record<string, { bg: string; label: string }> = {
  "pre-pmf": { bg: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200", label: "Pre-PMF" },
  "approaching": { bg: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200", label: "PMF 근접" },
  "achieved": { bg: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200", label: "PMF 달성" },
  "scaling": { bg: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200", label: "스케일업" },
};

// VOC 강도 스타일
const vocStyle: Record<string, { bg: string; label: string }> = {
  "strong": { bg: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200", label: "VOC 강함" },
  "moderate": { bg: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200", label: "VOC 보통" },
  "weak": { bg: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200", label: "VOC 부족" },
};

interface ExecutiveSummaryProps {
  oneLiner: string;
  currentPhase: string;
  momentum: string;
  momentumReason: string;
  keyNumbers: string[];
  pmfStage?: string;
  vocStrength?: string;
}

// ── ① Executive Summary ────────────────────────────────
export function ExecutiveSummary({
  oneLiner,
  currentPhase,
  momentum,
  momentumReason,
  keyNumbers,
  pmfStage,
  vocStrength,
}: ExecutiveSummaryProps) {
  const pmf = pmfStage ? pmfStyle[pmfStage] : undefined;
  const voc = vocStrength ? vocStyle[vocStrength] : undefined;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base">Executive Summary</CardTitle>
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge className={momentumStyle[momentum]?.bg || momentumStyle.neutral.bg}>
              {momentumStyle[momentum]?.label || "보합"}
            </Badge>
            <Badge variant="outline">{safeStr(currentPhase)}</Badge>
            {pmf && <Badge className={pmf.bg}>{pmf.label}</Badge>}
            {voc && <Badge className={voc.bg}>{voc.label}</Badge>}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-base font-semibold leading-relaxed">
          {safeStr(oneLiner)}
        </p>
        <p className="text-xs text-muted-foreground">
          {safeStr(momentumReason)}
        </p>
        {keyNumbers.length > 0 && (
          <div className="rounded-lg bg-muted/50 p-3 space-y-1.5">
            {keyNumbers.map((line, i) => (
              <div key={i} className="border-l-2 border-primary/40 pl-2.5">
                <p className="text-sm">{safeStr(line)}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
