const data = require("../src/data/excel-companies.json");
// 펠로십 멘토가 담당하는 기업들의 description 확인
const targets = ["렌트리","남도마켓","고이장례연구소","콘스탄트","넥스트그라운드","바인드","퍼스트랩","디에스","딥메트릭스","아헤스","코스모비"];
data.companies.forEach(function(c) {
  if (targets.indexOf(c.name) >= 0) {
    console.log(c.name + " (" + c.batchLabel + ", " + (c.investmentStage || "-") + ")");
    console.log("  > " + (c.description || "설명 없음"));
    console.log("");
  }
});
// 전체 description 보유율
let has = 0;
data.companies.forEach(function(c) { if (c.description) has++; });
console.log("기업 설명 보유:", has + "/" + data.companies.length);
