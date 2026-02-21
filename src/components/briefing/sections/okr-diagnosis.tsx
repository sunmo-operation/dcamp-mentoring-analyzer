import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { safeStr } from "@/lib/safe-render";

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
  // objectives가 배열이 아닌 경우 방어
  const safeObjectives = Array.isArray(objectives) ? objectives : [];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">핵심목표 (Objective & KPI) 진단</CardTitle>
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
                  style={{ width: `${Math.min(Number(overallRate) || 0, 100)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">전체 달성율</p>
            </div>
          </div>
        )}
        {safeObjectives.length > 0 && (
          <div className="space-y-2">
            {safeObjectives.map((obj, i) => {
              const rate = Number(obj.achievementRate) || 0;
              return (
                <div key={i} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="truncate mr-2">{safeStr(obj.name)}</span>
                    <span className="shrink-0 font-medium">
                      {rate}%
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
                          : rate >= 70
                          ? "bg-blue-500"
                          : rate >= 40
                          ? "bg-yellow-500"
                          : "bg-red-500"
                      }`}
                      style={{ width: `${Math.min(rate, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div className="space-y-2">
          <p className="text-sm leading-relaxed">{safeStr(trendAnalysis)}</p>
          {metricVsNarrative && (
            <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 dark:border-orange-800 dark:bg-orange-950">
              <p className="text-xs font-semibold text-orange-800 dark:text-orange-200 mb-1">
                &#9888; 지표 vs 내러티브 괴리
              </p>
              <p className="text-xs text-orange-700 dark:text-orange-300">
                {safeStr(metricVsNarrative)}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
