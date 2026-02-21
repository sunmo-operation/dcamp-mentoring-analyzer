import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { safeStr } from "@/lib/safe-render";

interface ResourceDiagnosisProps {
  primaryNeed: string;
  resourceLines: string[];
  dcampCanDoLines: string[];
}

// ── ⑥ 리소스 진단 ──────────────────────────────
export function ResourceDiagnosis({
  primaryNeed,
  resourceLines,
  dcampCanDoLines,
}: ResourceDiagnosisProps) {
  const safeLines = Array.isArray(dcampCanDoLines) ? dcampCanDoLines : [];

  if (!primaryNeed && safeLines.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">리소스 진단</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {primaryNeed && (
          <div className="space-y-2">
            <p className="text-base font-semibold">{safeStr(primaryNeed)}</p>
            {resourceLines.length > 0 && (
              <div className="space-y-1.5">
                {resourceLines.map((line, i) => (
                  <div key={i} className="border-l-2 border-muted-foreground/30 pl-2.5">
                    <p className="text-sm text-muted-foreground">{safeStr(line)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {safeLines.length > 0 && (
          <div className="rounded-lg bg-blue-50 dark:bg-blue-950 p-3">
            <p className="text-xs font-semibold text-blue-800 dark:text-blue-200 mb-2">
              dcamp 지원 가능
            </p>
            <ul className="space-y-1">
              {safeLines.map((line, i) => (
                <li key={i} className="text-sm text-blue-700 dark:text-blue-300 flex items-start gap-2">
                  <span className="shrink-0">&#8226;</span>
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
