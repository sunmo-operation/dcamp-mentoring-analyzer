import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RecommendedAction } from "@/types";

interface Props {
  actions: RecommendedAction[];
}

const priorityLabel: Record<string, string> = {
  urgent: "긴급",
  high: "높음",
  medium: "보통",
  low: "낮음",
};

const priorityColor: Record<string, string> = {
  urgent: "bg-red-100 text-red-800",
  high: "bg-orange-100 text-orange-800",
  medium: "bg-blue-100 text-blue-800",
  low: "bg-gray-100 text-gray-800",
};

export function SectionActions({ actions }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">추천 액션</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {actions.map((action, i) => (
            <div
              key={i}
              className="flex items-start gap-4 rounded-2xl border-0 bg-muted/30 p-5"
            >
              <span
                className={`mt-0.5 shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${priorityColor[action.priority] ?? ""}`}
              >
                {priorityLabel[action.priority] ?? action.priority}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-medium">{action.action}</p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span>담당: {action.owner}</span>
                  <span>기간: {action.timeline}</span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {action.expectedOutcome}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
