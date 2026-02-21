import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { safeStr } from "@/lib/safe-render";

interface UnspokenSignal {
  signal: string;
  detectedFrom: string;
  hypothesis: string;
  earlyWarning: string;
}

interface UnspokenSignalsProps {
  signals: UnspokenSignal[];
}

// ── ④ 말하지 않은 신호 ──────────────────────────────
export function UnspokenSignals({ signals }: UnspokenSignalsProps) {
  const safeSignals = Array.isArray(signals) ? signals : [];
  if (safeSignals.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">말하지 않은 신호</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {safeSignals.map((signal, i) => (
          <div
            key={i}
            className="rounded-lg border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-800 dark:bg-amber-950/50 space-y-2"
          >
            <p className="text-sm font-semibold">{safeStr(signal.signal)}</p>
            {signal.hypothesis && (
              <p className="text-sm text-muted-foreground leading-relaxed">
                {safeStr(signal.hypothesis)}
              </p>
            )}
            <div className="rounded-md bg-red-50 dark:bg-red-950/50 p-2.5 border border-red-200 dark:border-red-800">
              <p className="text-xs font-semibold text-red-700 dark:text-red-300 mb-1">
                리스크
              </p>
              <p className="text-xs text-red-600 dark:text-red-400 leading-relaxed">
                {safeStr(signal.earlyWarning)}
              </p>
            </div>
            <p className="text-[10px] text-muted-foreground/60">
              감지: {safeStr(signal.detectedFrom)}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
