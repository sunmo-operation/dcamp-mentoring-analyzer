import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { safeStr } from "@/lib/safe-render";

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
  const safeActions = Array.isArray(actions) ? actions : [];
  if (safeActions.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">PM 액션</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {safeActions.map((action, i) => (
            <div
              key={i}
              className="flex items-start gap-3 rounded-2xl border-0 bg-muted/30 p-4"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                {action.priority}
              </div>
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium">{safeStr(action.action)}</p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                  <Badge variant="outline" className="text-xs">
                    {safeStr(action.deadline)}
                  </Badge>
                  <span>{safeStr(action.why)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
