import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RiskSignal } from "@/types";

interface Props {
  risks: RiskSignal[];
}

export function SectionRisks({ risks }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">리스크 시그널</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {risks.map((risk, i) => (
            <div
              key={i}
              className="rounded-lg border-l-4 border-l-yellow-500 bg-yellow-50 p-4"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-sm">{risk.title}</span>
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                {risk.description}
              </p>
              {risk.pattern && (
                <p className="text-xs text-muted-foreground mb-1">
                  패턴: {risk.pattern}
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                대응: {risk.response}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
