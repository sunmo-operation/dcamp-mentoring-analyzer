const data = require("../src/data/mentor-fellowship.json");
let hasEmail = 0, hasPhone = 0, hasBoth = 0, missing = [];
data.mentors.forEach(function(m) {
  const e = m.email ? true : false;
  const p = m.phone ? true : false;
  if (e) hasEmail++;
  if (p) hasPhone++;
  if (e && p) hasBoth++;
  if (e === false && p === false) missing.push(m.name);
});
console.log("이메일 보유:", hasEmail + "/30");
console.log("전화번호 보유:", hasPhone + "/30");
console.log("둘 다 보유:", hasBoth + "/30");
if (missing.length) console.log("둘 다 없음:", missing.join(", "));
console.log("");
console.log("=== 연락처 현황 ===");
data.mentors.forEach(function(m) {
  console.log(m.name + " | " + (m.email || "X") + " | " + (m.phone || "X"));
});
