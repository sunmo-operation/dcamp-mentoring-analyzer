import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface MentorInsightsProps {
  repeatedAdviceLines: string[];
  ignoredAdviceLines: string[];
  executedAdvice: string;
}

// ── ⑤ 멘토 인사이트 ─────────────────────────────
export function MentorInsights({
  repeatedAdviceLines,
  ignoredAdviceLines,
  executedAdvice,
}: MentorInsightsProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">멘토 인사이트</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {repeatedAdviceLines.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">반복 강조 조언</p>
            <ul className="space-y-1">
              {repeatedAdviceLines.map((line, i) => (
                <li key={i} className="text-sm flex items-start gap-2">
                  <span className="shrink-0 text-primary">&#8226;</span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {ignoredAdviceLines.length > 0 && (
          <div className="rounded-lg border border-red-200 bg-red-50/50 p-3 dark:border-red-800 dark:bg-red-950/50">
            <p className="text-xs font-semibold text-red-800 dark:text-red-200 mb-2">
              &#9888; 반복됐지만 미실행
            </p>
            <ul className="space-y-1">
              {ignoredAdviceLines.map((line, i) => (
                <li key={i} className="text-sm text-red-700 dark:text-red-300 flex items-start gap-2">
                  <span className="shrink-0">&#8226;</span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {executedAdvice && (
          <>
            <Separator />
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1">멘토 매칭 적합성</p>
              <p className="text-sm leading-relaxed">{executedAdvice}</p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
