import Link from "next/link";
import { getCompanies } from "@/lib/data";
import { AnalysisForm } from "@/components/analysis/analysis-form";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ companyId?: string }>;
}

export default async function AnalyzePage({ searchParams }: Props) {
  const { companyId } = await searchParams;
  const companies = await getCompanies();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-sm text-muted-foreground transition-all duration-200 hover:bg-muted hover:text-foreground"
      >
        &larr; 홈으로
      </Link>
      <AnalysisForm companies={companies} defaultCompanyId={companyId} />
    </div>
  );
}
