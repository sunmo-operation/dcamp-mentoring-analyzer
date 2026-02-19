import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface UnspokenSignal {
  signal: string;
  detectedFrom: string;
  earlyWarning: string;
}

interface UnspokenSignalsProps {
  signals: UnspokenSignal[];
}

// ── ④ 말하지 않은 신호 ──────────────────────────────
export function UnspokenSignals({ signals }: UnspokenSignalsProps) {
  if (signals.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">말하지 않은 신호</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {signals.map((signal, i) => (
          <div
            key={i}
            className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-800 dark:bg-amber-950/50 space-y-1.5"
          >
            <p className="text-sm font-medium">{signal.signal}</p>
            <p className="text-xs text-muted-foreground">
              {signal.detectedFrom}
            </p>
            <p className="text-xs font-medium text-red-600 dark:text-red-400">
              &#9888; {signal.earlyWarning}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
