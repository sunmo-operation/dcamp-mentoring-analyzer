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
        {/* 반복 강조 조언 — 간결한 줄 기반 */}
        {repeatedAdviceLines.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">반복 강조 조언</p>
            <div className="space-y-1.5">
              {repeatedAdviceLines.slice(0, 4).map((line, i) => (
                <div key={i} className="border-l-2 border-primary/40 pl-3">
                  <p className="text-sm leading-relaxed">{line}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 반복됐지만 미실행 — 경고 박스 */}
        {ignoredAdviceLines.length > 0 && (
          <div className="rounded-lg border border-red-200 bg-red-50/50 p-3 dark:border-red-800 dark:bg-red-950/50">
            <p className="text-xs font-semibold text-red-800 dark:text-red-200 mb-2">
              미실행 조언
            </p>
            <div className="space-y-1.5">
              {ignoredAdviceLines.slice(0, 3).map((line, i) => (
                <div key={i} className="border-l-2 border-red-300 dark:border-red-700 pl-3">
                  <p className="text-sm text-red-700 dark:text-red-300 leading-relaxed">{line}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 멘토 매칭 적합성 */}
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
