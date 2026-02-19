import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface OkrObjective {
  name: string;
  achievementRate: number;
  achieved: boolean;
}

interface OkrDiagnosisProps {
  overallRate: number | null;
  objectives: OkrObjective[];
  trendAnalysis: string;
  metricVsNarrative: string | null;
}

// ── ② OKR 진단 ──────────────────────────────────
export function OkrDiagnosis({
  overallRate,
  objectives,
  trendAnalysis,
  metricVsNarrative,
}: OkrDiagnosisProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">OKR 진단</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {overallRate !== null && (
          <div className="flex items-center gap-4">
            <span className="text-3xl font-bold">
              {overallRate}%
            </span>
            <div className="flex-1">
              <div className="h-3 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${Math.min(overallRate, 100)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">전체 달성율</p>
            </div>
          </div>
        )}
        {objectives && objectives.length > 0 && (
          <div className="space-y-2">
            {objectives.map((obj, i) => (
              <div key={i} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="truncate mr-2">{obj.name}</span>
                  <span className="shrink-0 font-medium">
                    {obj.achievementRate}%
                    {obj.achieved && (
                      <span className="ml-1 text-green-600">&#10003;</span>
                    )}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      obj.achieved
                        ? "bg-green-500"
                        : obj.achievementRate >= 70
                        ? "bg-blue-500"
                        : obj.achievementRate >= 40
                        ? "bg-yellow-500"
                        : "bg-red-500"
                    }`}
                    style={{ width: `${Math.min(obj.achievementRate, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="space-y-2">
          <p className="text-sm leading-relaxed">{trendAnalysis}</p>
          {metricVsNarrative && (
            <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 dark:border-orange-800 dark:bg-orange-950">
              <p className="text-xs font-semibold text-orange-800 dark:text-orange-200 mb-1">
                &#9888; 지표 vs 내러티브 괴리
              </p>
              <p className="text-xs text-orange-700 dark:text-orange-300">
                {metricVsNarrative}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
