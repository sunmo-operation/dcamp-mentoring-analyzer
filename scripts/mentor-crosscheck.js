const data = require("../src/data/excel-companies.json");

// 멘토 펠로십 명단
const fellowshipMentors = [
  { name: "강지호", status: "V" },
  { name: "권오란", status: "X" },
  { name: "권혁찬", status: "V" },
  { name: "김병완", status: "V" },
  { name: "김정한", status: "V" },
  { name: "김현준", status: "V" },
  { name: "김희성", status: "X" },
  { name: "댄박", status: "V" },
  { name: "류준우", status: "V" },
  { name: "신임철", status: "X" },
  { name: "이승국", status: "V" },
  { name: "이태양", status: "-" },
  { name: "임승현", status: "X" },
  { name: "정성훈", status: "V" },
  { name: "정용준", status: "-" },
  { name: "정지성", status: "V" },
  { name: "최유환", status: "V" },
  { name: "최형철", status: "V" },
  { name: "하용호", status: "V" },
  { name: "홍기현", status: "V" },
  { name: "홍준", status: "X" },
  { name: "황희철", status: "V" },
  { name: "심규섭", status: "V" },
  { name: "조중현", status: "V" },
  { name: "정재훈", status: "V" },
  { name: "염재승", status: "V" },
  { name: "이성호", status: "V" },
  { name: "신재식", status: "V" },
  { name: "채명수", status: "V" },
  { name: "이헌주", status: "X" },
];

console.log("총 멘토 펠로십 인원:", fellowshipMentors.length, "명\n");

// 엑셀에서 멘토별 담당 기업 매핑 구축
const mentorCompanies = {};

function addMentor(nameStr, company, type) {
  if (nameStr == null) return;
  nameStr.split(",").map(function(s) { return s.trim(); }).forEach(function(m) {
    if (m && m !== "없음") {
      if (mentorCompanies[m] == null) mentorCompanies[m] = [];
      mentorCompanies[m].push({
        company: company.name,
        batch: company.batchLabel,
        type: type,
        stage: company.investmentStage || "-",
        field: company.field || "-"
      });
    }
  });
}

data.companies.forEach(function(c) {
  addMentor(c.dedicatedMentor, c, "전담");
  addMentor(c.expertMentor, c, "전문가");
});

// 크로스체크 결과
console.log("=== 엑셀 크로스체크 결과 ===\n");
let found = 0;
let notFound = 0;
const notFoundList = [];

fellowshipMentors.forEach(function(fm) {
  const companies = mentorCompanies[fm.name];
  if (companies) {
    found++;
    console.log("O " + fm.name + " [" + fm.status + "] - 엑셀 데이터 있음");
    companies.forEach(function(c) {
      console.log("   > " + c.company + " (" + c.batch + ", " + c.type + ", " + c.stage + ", " + c.field + ")");
    });
  } else {
    notFound++;
    notFoundList.push(fm.name);
    console.log("X " + fm.name + " [" + fm.status + "] - 엑셀에 없음");
  }
});

console.log("\n=== 요약 ===");
console.log("엑셀에 있음:", found, "명");
console.log("엑셀에 없음:", notFound, "명");
if (notFoundList.length > 0) {
  console.log("없는 멘토:", notFoundList.join(", "));
}
