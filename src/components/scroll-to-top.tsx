"use client";

import { useEffect } from "react";

// 페이지 진입 시 스크롤을 최상단으로 이동시키는 컴포넌트
export function ScrollToTop() {
  useEffect(() => {
    window.scrollTo(0, 0);
    // 네비게이션 완료 타이밍 측정 (CompanyCard에서 시작한 마크 기준)
    if (typeof performance !== "undefined" && performance.getEntriesByName("nav-start").length > 0) {
      performance.mark("nav-end");
      const measure = performance.measure("nav-duration", "nav-start", "nav-end");
      console.log(`[perf] 페이지 도착: ${Math.round(measure.duration)}ms (클릭 → 첫 렌더)`);
      performance.clearMarks("nav-start");
      performance.clearMarks("nav-end");
      performance.clearMeasures("nav-duration");
    }
  }, []);
  return null;
}
