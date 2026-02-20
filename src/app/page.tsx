import { getCompaniesBasic, getAnalyses } from "@/lib/data";
import { HomeClient } from "@/components/home-client";

// 빌드 시 정적 생성 대신 요청 시 데이터를 가져오도록 설정
export const dynamic = "force-dynamic";

export default async function HomePage() {
  // 경량 기업 조회(Notion API 1회) + 로컬 JSON을 병렬 호출
  // 에러 발생 시 빈 배열로 대체하여 빌드 실패 방지
  const [companies, allAnalyses] = await Promise.all([
    getCompaniesBasic().catch(() => []),
    getAnalyses().catch(() => []),
  ]);

  // 최근 분석 5건 (별도 호출 대신 메모리에서 필터링)
  const recentAnalyses = allAnalyses
    .filter((a) => a.status === "completed")
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, 5);

  // 기업별 분석 횟수 계산
  const analysisCountByCompany: Record<string, number> = {};
  for (const a of allAnalyses) {
    if (a.status === "completed") {
      analysisCountByCompany[a.companyId] =
        (analysisCountByCompany[a.companyId] ?? 0) + 1;
    }
  }

  return (
    <HomeClient
      companies={companies}
      recentAnalyses={recentAnalyses}
      analysisCountByCompany={analysisCountByCompany}
    />
  );
}
