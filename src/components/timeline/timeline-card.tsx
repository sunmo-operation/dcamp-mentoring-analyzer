import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { TimelineEvent, ExpertRequest } from "@/types";

// ── 소스 배지 색상 ──────────────────────────────
const SOURCE_STYLES: Record<string, string> = {
  notion: "bg-purple-100 text-purple-700 border-purple-200",
  slack: "bg-green-100 text-green-700 border-green-200",
  manual: "bg-gray-100 text-gray-600 border-gray-200",
  gmail: "bg-red-100 text-red-600 border-red-200",
};

const SOURCE_LABELS: Record<string, string> = {
  notion: "Notion",
  slack: "Slack",
  manual: "Manual",
  gmail: "Gmail",
};

// ── 타입별 아이콘 + 라벨 ────────────────────────
const TYPE_CONFIG: Record<
  string,
  { icon: string; label: string }
> = {
  mentoring: { icon: "📝", label: "멘토링 세션" },
  checkpoint: { icon: "🔍", label: "점검/체크업" },
  expert_request: { icon: "🎓", label: "전문가 요청" },
  company_update: { icon: "📊", label: "근황 업데이트" },
  meeting: { icon: "💬", label: "회의" },
};

// ── 전문가 요청 상태 배지 색상 ───────────────────
function getStatusStyle(status?: string) {
  if (!status) return "bg-gray-100 text-gray-600";
  if (["진행 완료", "완료"].some((s) => status.includes(s)))
    return "bg-green-100 text-green-700";
  if (["매칭 중", "검토 중", "일정 확정", "진행중"].some((s) => status.includes(s)))
    return "bg-blue-100 text-blue-700";
  if (status.includes("지원불가"))
    return "bg-red-100 text-red-700";
  return "bg-gray-100 text-gray-600";
}

// ── 긴급성 배지 색상 ────────────────────────────
function getUrgencyStyle(urgency?: string) {
  if (!urgency) return "";
  if (urgency === "긴급") return "bg-red-100 text-red-700";
  if (urgency === "보통") return "bg-yellow-100 text-yellow-700";
  return "bg-gray-100 text-gray-600";
}

interface TimelineCardProps {
  event: TimelineEvent;
  // expert_request 이벤트에 추가 정보 전달
  expertRequest?: ExpertRequest;
}

export function TimelineCard({ event, expertRequest }: TimelineCardProps) {
  const typeConfig = TYPE_CONFIG[event.type] || TYPE_CONFIG.meeting;
  const sourceStyle = SOURCE_STYLES[event.source] || SOURCE_STYLES.manual;
  const sourceLabel = SOURCE_LABELS[event.source] || event.source;
  const participants = event.metadata.participants;
  const preview = event.rawContent
    ? event.rawContent.slice(0, 150) + (event.rawContent.length > 150 ? "…" : "")
    : "-";

  const isExpert = event.type === "expert_request";
  const canAnalyze = event.type === "mentoring" || event.type === "checkpoint";

  return (
    <Card className="hover:-translate-y-0.5 hover:shadow-[0_2px_8px_rgba(0,0,0,0.06),0_8px_24px_rgba(0,0,0,0.1)]">
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-lg shrink-0" role="img" aria-label={typeConfig.label}>{typeConfig.icon}</span>
            <span className="font-medium text-sm truncate">{typeConfig.label}</span>
            <Badge
              variant="outline"
              className={`text-[10px] shrink-0 ${sourceStyle}`}
            >
              {sourceLabel}
            </Badge>
          </div>
          <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
            {event.date
              ? new Date(event.date).toLocaleDateString("ko-KR")
              : "-"}
          </span>
        </div>
      </CardHeader>

      <CardContent className="px-4 pb-4 space-y-2">
        {/* 제목 */}
        <p className="font-semibold text-sm leading-snug">
          {event.title || "-"}
        </p>

        {/* 참여자 */}
        <p className="text-xs text-muted-foreground">
          참여자: {participants?.length ? participants.length + "명" : "-"}
        </p>

        {/* rawContent 미리보기 */}
        <p className="text-sm text-muted-foreground line-clamp-3 whitespace-pre-wrap">
          {preview}
        </p>

        {/* 전문가 요청: 상태 + 긴급성 배지 */}
        {isExpert && expertRequest && (
          <div className="flex items-center gap-2 pt-1">
            <Badge
              variant="outline"
              className={`text-xs ${getStatusStyle(expertRequest.status)}`}
            >
              {expertRequest.status || "-"}
            </Badge>
            {expertRequest.urgency && (
              <Badge
                variant="outline"
                className={`text-xs ${getUrgencyStyle(expertRequest.urgency)}`}
              >
                {expertRequest.urgency}
              </Badge>
            )}
          </div>
        )}

        {/* 액션 버튼: mentoring/checkpoint만 */}
        {canAnalyze && event.metadata.notionPageId && (
          <div className="pt-1">
            <Link
              href={`/analyze?sessionId=${event.metadata.notionPageId}`}
              className="inline-flex items-center rounded-2xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-all duration-200 hover:bg-[#1B6EF3] hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(49,130,246,0.3)]"
            >
              분석하기
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
