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
        <Link href="/" className="rounded-lg px-2 py-1 transition-colors hover:bg-muted hover:text-foreground">
          홈
        </Link>
        <span className="text-muted-foreground/50">/</span>
        {company && (
          <>
            <Link
              href={`/companies/${company.notionPageId}`}
              className="rounded-lg px-2 py-1 transition-colors hover:bg-muted hover:text-foreground"
            >
              {company.name}
            </Link>
            <span className="text-muted-foreground/50">/</span>
          </>
        )}
        <span className="text-foreground font-medium">분석 결과</span>
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
          <div className="relative flex items-center justify-center mb-6">
            <div className="absolute h-16 w-16 rounded-full bg-primary/20 animate-ping" />
            <div className="relative h-12 w-12 rounded-full bg-gradient-to-br from-primary to-indigo-500 flex items-center justify-center shadow-lg shadow-primary/25">
              <svg className="h-6 w-6 text-white animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            </div>
          </div>
          <p className="text-foreground font-semibold">AI가 분석 중입니다</p>
          <p className="text-sm text-muted-foreground mt-1">잠시만 기다려주세요</p>
        </div>
      )}

      {analysis.status === "failed" && (
        <div className="rounded-2xl border-0 bg-destructive/5 p-8 text-center">
          <p className="text-destructive font-semibold text-lg">분석에 실패했습니다</p>
          {analysis.errorMessage && (
            <p className="mt-2 text-sm text-muted-foreground">
              {analysis.errorMessage}
            </p>
          )}
          <Link
            href="/analyze"
            className="mt-4 inline-flex items-center rounded-2xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all duration-200 hover:bg-[#1B6EF3] hover:-translate-y-0.5"
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
      <div className="mt-10 flex items-center justify-between border-t border-border/50 pt-6">
        <Link
          href={company ? `/companies/${company.notionPageId}` : "/"}
          className="rounded-xl px-3 py-1.5 text-sm text-muted-foreground transition-all duration-200 hover:bg-muted hover:text-foreground"
        >
          &larr; {company ? `${company.name} 페이지로` : "홈으로"}
        </Link>
        <Link
          href="/analyze"
          className="rounded-2xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all duration-200 hover:bg-[#1B6EF3] hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(49,130,246,0.3)]"
        >
          새 분석
        </Link>
      </div>
    </div>
  );
}
