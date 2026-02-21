import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyButton } from "../copy-button";
import { safeStr } from "@/lib/safe-render";

interface MeetingStrategyProps {
  focus: string;
  keyQuestions: string[];
  openingLine: string;
  avoid: string;
}

// ── ⑦ 미팅 전략 ─────────────────────────────────
export function MeetingStrategy({
  focus,
  keyQuestions,
  openingLine,
  avoid,
}: MeetingStrategyProps) {
  // keyQuestions가 배열이 아닌 경우 방어 (DB에서 읽은 데이터 오류 대응)
  const safeQuestions = Array.isArray(keyQuestions) ? keyQuestions : [];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">미팅 전략</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {focus && (
          <div className="rounded-lg bg-primary/5 border-2 border-primary/20 p-4">
            <p className="text-xs font-semibold text-primary mb-1">이번 세션 핵심</p>
            <p className="text-base font-semibold">{safeStr(focus)}</p>
          </div>
        )}

        {safeQuestions.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">핵심 질문</p>
            {safeQuestions.map((q, i) => {
              const questionText = safeStr(q);
              return (
                <div
                  key={i}
                  className="flex items-start justify-between gap-2 rounded-2xl border-0 bg-muted/30 p-4"
                >
                  <div className="flex items-start gap-2 min-w-0">
                    <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                      Q{i + 1}
                    </span>
                    <p className="text-sm">{questionText}</p>
                  </div>
                  <CopyButton text={questionText} />
                </div>
              );
            })}
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          {openingLine && (
            <div className="rounded-lg bg-amber-50 dark:bg-amber-950 p-3">
              <p className="text-xs font-semibold text-amber-800 dark:text-amber-200 mb-1">
                주목할 것
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                {safeStr(openingLine)}
              </p>
            </div>
          )}
          {avoid && (
            <div className="rounded-lg bg-red-50 dark:bg-red-950 p-3">
              <p className="text-xs font-semibold text-red-800 dark:text-red-200 mb-1">
                피해야 할 것
              </p>
              <p className="text-sm text-red-700 dark:text-red-300">
                {safeStr(avoid)}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
