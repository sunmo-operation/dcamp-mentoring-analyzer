import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RootChallenge } from "@/types";

interface Props {
  causes: RootChallenge[];
}

const severityLabel: Record<string, string> = {
  high: "높음",
  medium: "보통",
  low: "낮음",
};

const severityColor: Record<string, string> = {
  high: "bg-red-100 text-red-800",
  medium: "bg-yellow-100 text-yellow-800",
  low: "bg-green-100 text-green-800",
};

export function SectionRootCauses({ causes }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">근본 과제 분석</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {causes.map((cause, i) => (
            <div key={i} className="rounded-lg border p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h4 className="font-semibold">{cause.title}</h4>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="outline">{cause.category}</Badge>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${severityColor[cause.severity] ?? ""}`}
                  >
                    {severityLabel[cause.severity] ?? cause.severity}
                  </span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                {cause.description}
              </p>
              <div className="rounded bg-muted/50 p-2 text-xs text-muted-foreground">
                구조적 원인: {cause.structuralCause}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
