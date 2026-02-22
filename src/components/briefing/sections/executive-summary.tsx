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
          <div className="rounded-xl bg-muted/40 p-4">
            <p className="text-[11px] font-semibold text-muted-foreground mb-3 uppercase tracking-wider">핵심 지표 & 현황</p>
            <ul className="space-y-2">
              {keyNumbers.map((line, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm leading-relaxed">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
                  <span>{safeStr(line)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
