"use client";

import { useEffect } from "react";

// 페이지 진입 시 스크롤을 최상단으로 이동시키는 컴포넌트
export function ScrollToTop() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  return null;
}
