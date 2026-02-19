import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ResourceDiagnosisProps {
  primaryNeed: string;
  resourceReasoning: string;
  dcampCanDoLines: string[];
}

// ── ⑥ 리소스 진단 ──────────────────────────────
export function ResourceDiagnosis({
  primaryNeed,
  resourceReasoning,
  dcampCanDoLines,
}: ResourceDiagnosisProps) {
  if (!primaryNeed && dcampCanDoLines.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">리소스 진단</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {primaryNeed && (
          <div>
            <p className="text-base font-semibold">{primaryNeed}</p>
            {resourceReasoning && (
              <p className="text-sm text-muted-foreground mt-1">{resourceReasoning}</p>
            )}
          </div>
        )}

        {dcampCanDoLines.length > 0 && (
          <div className="rounded-lg bg-blue-50 dark:bg-blue-950 p-3">
            <p className="text-xs font-semibold text-blue-800 dark:text-blue-200 mb-2">
              dcamp 지원 가능
            </p>
            <ul className="space-y-1">
              {dcampCanDoLines.map((line, i) => (
                <li key={i} className="text-sm text-blue-700 dark:text-blue-300 flex items-start gap-2">
                  <span className="shrink-0">&#8226;</span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
