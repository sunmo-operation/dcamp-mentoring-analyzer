import { notFound } from "next/navigation";
import Link from "next/link";
import { getAnalysis, getCompany } from "@/lib/data";
import { Badge } from "@/components/ui/badge";
import { SectionSummary } from "@/components/analysis/section-summary";
import { SectionSurface } from "@/components/analysis/section-surface";
import { SectionRootCauses } from "@/components/analysis/section-root-causes";
import { SectionActions } from "@/components/analysis/section-actions";
import { SectionRisks } from "@/components/analysis/section-risks";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AnalysisResultPage({ params }: Props) {
  const { id } = await params;
  const analysis = await getAnalysis(id);

  if (!analysis) notFound();

  const company = await getCompany(analysis.companyId);

  const date = new Date(analysis.createdAt).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const { sections } = analysis;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* 네비게이션 */}
      <div className="flex items-center gap-2 mb-6 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">
          홈
        </Link>
        <span>/</span>
        {company && (
          <>
            <Link
              href={`/companies/${company.notionPageId}`}
              className="hover:text-foreground"
            >
              {company.name}
            </Link>
            <span>/</span>
          </>
        )}
        <span className="text-foreground">분석 결과</span>
      </div>

      {/* 헤더 */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          {company && (
            <Badge variant="outline">{company.name}</Badge>
          )}
          {analysis.topic && (
            <Badge variant="secondary">{analysis.topic}</Badge>
          )}
        </div>
        <h1 className="text-2xl font-bold">
          {sections.summary?.oneLiner ?? "분석 결과"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {analysis.mentorName} &middot; {analysis.mentoringDate} &middot; 분석
          일시: {date}
        </p>
      </div>

      {/* 분석 진행중/실패 상태 */}
      {analysis.status === "analyzing" && (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mb-4" />
          <p className="text-muted-foreground">AI가 분석 중입니다...</p>
        </div>
      )}

      {analysis.status === "failed" && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
          <p className="text-destructive font-medium">분석에 실패했습니다</p>
          {analysis.errorMessage && (
            <p className="mt-2 text-sm text-muted-foreground">
              {analysis.errorMessage}
            </p>
          )}
          <Link
            href="/analyze"
            className="mt-4 inline-block text-sm underline hover:no-underline"
          >
            다시 시도
          </Link>
        </div>
      )}

      {/* 5개 분석 섹션 */}
      {analysis.status === "completed" && (
        <div className="space-y-6">
          {sections.summary && <SectionSummary summary={sections.summary} />}

          {sections.surfaceIssues && sections.surfaceIssues.length > 0 && (
            <SectionSurface issues={sections.surfaceIssues} />
          )}

          {sections.rootChallenges && sections.rootChallenges.length > 0 && (
            <SectionRootCauses causes={sections.rootChallenges} />
          )}

          {sections.recommendedActions &&
            sections.recommendedActions.length > 0 && (
              <SectionActions actions={sections.recommendedActions} />
            )}

          {sections.riskSignals && sections.riskSignals.length > 0 && (
            <SectionRisks risks={sections.riskSignals} />
          )}
        </div>
      )}

      {/* 하단 액션 */}
      <div className="mt-10 flex items-center justify-between border-t pt-6">
        <Link
          href={company ? `/companies/${company.notionPageId}` : "/"}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          &larr; {company ? `${company.name} 페이지로` : "홈으로"}
        </Link>
        <Link
          href="/analyze"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          새 분석
        </Link>
      </div>
    </div>
  );
}
