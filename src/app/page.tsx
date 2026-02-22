import { getCompaniesBasic, getAnalyses } from "@/lib/data";
import { HomeClient } from "@/components/home-client";

// ISR: 5분간 캐시된 HTML 반환, 이후 백그라운드 재생성
// SWR이 클라이언트에서 60초마다 갱신하므로 데이터 신선도 보장
export const revalidate = 300;

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
