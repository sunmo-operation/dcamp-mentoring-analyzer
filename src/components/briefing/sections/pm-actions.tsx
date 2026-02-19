import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface PmAction {
  priority: number;
  action: string;
  deadline: string;
  why: string;
}

interface PmActionsProps {
  actions: PmAction[];
}

// ── ⑧ PM 액션 ──────────────────────────────────
export function PmActions({ actions }: PmActionsProps) {
  if (actions.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">PM 액션</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {actions.map((action, i) => (
            <div
              key={i}
              className="flex items-start gap-3 rounded-lg border p-3"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                {action.priority}
              </div>
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium">{action.action}</p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                  <Badge variant="outline" className="text-xs">
                    {action.deadline}
                  </Badge>
                  <span>{action.why}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
