// ══════════════════════════════════════════════════
// excel-data.ts — 엑셀 마스터 시트 JSON 로더
// [마스터] 디캠프 배치 ALL.xlsx → excel-companies.json
// ══════════════════════════════════════════════════
import type { ExcelEnrichedData } from "@/types";
import excelRaw from "@/data/excel-companies.json";

// JSON에서 로드된 원본 타입
interface ExcelCompanyRaw {
  name: string;
  batchLabel?: string;
  managementId?: string;
  participationDate?: string;
  graduationDate?: string;
  pmPrimary?: string;
  pmSecondary?: string;
  dedicatedMentor?: string;
  expertMentor?: string;
  staff?: string;
  description?: string;
  field?: string;
  businessType?: string;
  investmentStage?: string;
  ceoName?: string;
  email?: string;
  phone?: string;
  foundedDate?: string;
  website?: string;
  teamSize?: number;
  investment?: Record<string, string>;
  survey?: Record<string, string>;
}

interface ExcelData {
  lastUpdated: string;
  source: string;
  stats: { totalCompanies: number; withInvestment: number; withSurvey: number };
  companies: ExcelCompanyRaw[];
}

const data = excelRaw as ExcelData;

// 기업명 정규화 (법인 접두사 제거 + 공백 제거 + 소문자)
function normalizeName(name: string): string {
  return name
    .replace(/주식회사\s?/g, "")
    .replace(/\(주\)/g, "")
    .replace(/㈜/g, "")
    .replace(/\s/g, "")
    .toLowerCase();
}

// 이름 → 엑셀 데이터 매핑 (초기화 시 한 번만 빌드)
const excelMap = new Map<string, ExcelCompanyRaw>();
for (const c of data.companies) {
  excelMap.set(normalizeName(c.name), c);
}

/**
 * Notion 기업명으로 엑셀 보강 데이터 조회
 * 정규화된 이름으로 퍼지 매칭 수행
 */
export function getExcelDataByName(companyName: string): ExcelEnrichedData | null {
  const norm = normalizeName(companyName);

  // 정확 매칭
  let raw = excelMap.get(norm);

  // 부분 매칭 (정확 매칭 실패 시)
  if (!raw) {
    for (const [key, value] of excelMap) {
      if (norm.includes(key) || key.includes(norm)) {
        raw = value;
        break;
      }
    }
  }

  if (!raw) return null;

  return {
    managementId: raw.managementId,
    participationDate: raw.participationDate,
    graduationDate: raw.graduationDate,
    pmPrimary: raw.pmPrimary,
    pmSecondary: raw.pmSecondary,
    dedicatedMentor: raw.dedicatedMentor,
    expertMentor: raw.expertMentor,
    staff: raw.staff,
    email: raw.email,
    phone: raw.phone,
    field: raw.field,
    investment: raw.investment ? {
      fundingStatus: raw.investment.fundingStatus,
      latestRound: raw.investment.latestRound,
      preMoneyValuation: raw.investment.preMoneyValuation,
      latestFundingAmount: raw.investment.latestFundingAmount,
      latestFundingDate: raw.investment.latestFundingDate,
      leadInvestor: raw.investment.leadInvestor,
      participatingInvestors: raw.investment.participatingInvestors,
      cumulativeFunding: raw.investment.cumulativeFunding,
      nextRound: raw.investment.nextRound,
      targetAmount: raw.investment.targetAmount,
      progress: raw.investment.progress,
      revenue2025: raw.investment.revenue2025,
    } : undefined,
    survey: raw.survey ? {
      surveyBatch: raw.survey.surveyBatch,
      productIntro: raw.survey.productIntro,
      orgStatus: raw.survey.orgStatus,
      investmentStatus: raw.survey.investmentStatus,
      targetCustomer: raw.survey.targetCustomer,
      businessModel: raw.survey.businessModel,
      revenueModel: raw.survey.revenueModel,
      valueProposition: raw.survey.valueProposition,
      idealSuccess: raw.survey.idealSuccess,
      yearGoal: raw.survey.yearGoal,
      biggestChallenge: raw.survey.biggestChallenge,
      currentFocus: raw.survey.currentFocus,
      desiredSupport: raw.survey.desiredSupport,
      dcampExpectation: raw.survey.dcampExpectation,
      competitors: raw.survey.competitors,
      trlStage: raw.survey.trlStage,
      ipStatus: raw.survey.ipStatus,
      painPoints: raw.survey.painPoints,
      moat: raw.survey.moat,
    } : undefined,
  };
}

/**
 * 전체 엑셀 기업 목록 반환 (통계 용도)
 */
export function getExcelStats() {
  return data.stats;
}
