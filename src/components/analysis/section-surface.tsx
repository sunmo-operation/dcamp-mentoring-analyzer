import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SurfaceIssue } from "@/types";

interface Props {
  issues: SurfaceIssue[];
}

export function SectionSurface({ issues }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">표면 이슈 (팀이 말한 것)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {issues.map((issue, i) => (
            <div key={i} className="border-l-2 border-primary/30 pl-4 rounded-r-xl">
              <p className="font-medium">&ldquo;{issue.title}&rdquo;</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {issue.description}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
