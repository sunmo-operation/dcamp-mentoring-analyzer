import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { categoryStyle } from "../briefing-styles";
import { safeStr } from "@/lib/safe-render";

interface PositiveShift {
  shift: string;
  evidence: string;
  detectedFrom: string;
  impactArea: string;
}

interface PositiveShiftsProps {
  shifts: PositiveShift[];
}

export function PositiveShifts({ shifts }: PositiveShiftsProps) {
  const safeShifts = Array.isArray(shifts) ? shifts : [];
  if (safeShifts.length === 0) return null;

  return (
    <Card className="border-green-200 dark:border-green-900">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-green-100 text-green-700 text-xs dark:bg-green-900 dark:text-green-300">
            ↑
          </span>
          긍정적 변화
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {safeShifts.map((item, i) => (
          <div
            key={i}
            className="rounded-2xl border-0 bg-green-50/50 p-5 space-y-2 dark:bg-green-950/30"
          >
            <div className="flex items-center gap-2 flex-wrap">
              {item.impactArea && (
                <Badge className={categoryStyle[item.impactArea] || "bg-green-100 text-green-800"}>
                  {safeStr(item.impactArea)}
                </Badge>
              )}
              <span className="text-sm font-semibold">{safeStr(item.shift)}</span>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {safeStr(item.evidence)}
            </p>
            {item.detectedFrom && (
              <p className="text-xs text-muted-foreground/70">
                근거: {safeStr(item.detectedFrom)}
              </p>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
