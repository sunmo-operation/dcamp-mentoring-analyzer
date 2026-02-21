import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { threatStyle, policyTypeStyle } from "../briefing-styles";

// ── 경쟁사 타입 ──────────────────────────────────
interface Competitor {
  name: string;
  description: string;
  stage: string;
  similarity: string;
  implications: string; // 시사점 & 고민 사안
  recentMove: string;
  threatLevel: "high" | "medium" | "low";
}

// ── 업계 트렌드 타입 ────────────────────────────
interface IndustryTrend {
  trend: string;
  impact: string;
  source: string;
  url?: string;
}

// ── 법령/정책 타입 ──────────────────────────────
interface RegulatoryItem {
  title: string;
  type: string;
  impact: string;
  actionRequired: string;
  url?: string;
}

interface IndustryContextProps {
  competitors: Competitor[];
  industryTrends: IndustryTrend[];
  regulatoryAndPolicy: RegulatoryItem[];
  marketInsight: string;
}

// ── 업계 동향 / 경쟁 환경 / 법령·정책 ──────────────
export function IndustryContext({
  competitors,
  industryTrends,
  regulatoryAndPolicy,
  marketInsight,
}: IndustryContextProps) {
  const hasContent =
    competitors.length > 0 ||
    industryTrends.length > 0 ||
    regulatoryAndPolicy.length > 0 ||
    marketInsight;

  if (!hasContent) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">업계 동향 & 경쟁 환경</CardTitle>
        <p className="text-xs text-muted-foreground">AI 분석 기반 (최신 정보와 다를 수 있음)</p>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* 시장 인사이트 한 줄 요약 */}
        {marketInsight && (
          <p className="text-sm font-medium leading-relaxed border-l-2 border-primary pl-3">
            {marketInsight}
          </p>
        )}

        {/* ── 경쟁서비스 분석 ──────────────────────── */}
        {competitors.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-3">경쟁서비스 분석</p>
            <div className="space-y-3">
              {competitors.map((c, i) => {
                const threat = threatStyle[c.threatLevel] || threatStyle.medium;
                return (
                  <div key={i} className="rounded-lg border p-4 space-y-2">
                    {/* 헤더: 경쟁사명 + 위협도 + 스테이지 */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold">{c.name}</span>
                      <Badge className={threat.bg}>{threat.label}</Badge>
                      {c.stage && (
                        <Badge variant="outline" className="text-xs">{c.stage}</Badge>
                      )}
                    </div>
                    {/* 설명 */}
                    {c.description && (
                      <p className="text-sm text-muted-foreground">{c.description}</p>
                    )}
                    {/* 경쟁 포인트 / 시사점 */}
                    <div className="grid gap-2 sm:grid-cols-2">
                      {c.similarity && (
                        <div className="rounded-md bg-muted/50 p-2.5">
                          <p className="text-[10px] font-semibold text-muted-foreground mb-0.5">경쟁 포인트</p>
                          <p className="text-xs leading-relaxed">{c.similarity}</p>
                        </div>
                      )}
                      {c.implications && (
                        <div className="rounded-md bg-amber-50/50 dark:bg-amber-950/30 p-2.5">
                          <p className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 mb-0.5">시사점 & 고민 사안</p>
                          <p className="text-xs leading-relaxed">{c.implications}</p>
                        </div>
                      )}
                    </div>
                    {/* 최근 동향 */}
                    {c.recentMove && (
                      <p className="text-xs text-muted-foreground/70">
                        최근 동향: {c.recentMove}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── 업계 트렌드 ──────────────────────────── */}
        {industryTrends.length > 0 && (
          <>
            {competitors.length > 0 && <Separator />}
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-3">주요 업계 트렌드</p>
              <div className="space-y-2">
                {industryTrends.map((t, i) => (
                  <div key={i} className="border-l-2 border-purple-400 pl-3 py-1">
                    <p className="text-sm font-medium">{t.trend}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{t.impact}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {t.source && (
                        <p className="text-[10px] text-muted-foreground/60">
                          출처: {t.source}
                        </p>
                      )}
                      {t.url && (
                        <a
                          href={t.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-blue-500 hover:text-blue-700 underline"
                        >
                          자세히 보기 →
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ── 법령 / 정책 / 지원사업 ──────────────────── */}
        {regulatoryAndPolicy.length > 0 && (
          <>
            {(competitors.length > 0 || industryTrends.length > 0) && <Separator />}
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-3">법령 / 정책 / 지원사업</p>
              <div className="space-y-2">
                {regulatoryAndPolicy.map((r, i) => (
                  <div key={i} className="rounded-lg border p-3 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={policyTypeStyle[r.type] || policyTypeStyle["업계소식"]}>
                        {r.type}
                      </Badge>
                      <span className="text-sm font-medium">{r.title}</span>
                      {r.url && (
                        <a
                          href={r.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-blue-500 hover:text-blue-700 underline ml-auto"
                        >
                          원문 보기 →
                        </a>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{r.impact}</p>
                    {r.actionRequired && (
                      <p className="text-xs font-medium text-primary">
                        {r.actionRequired}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
