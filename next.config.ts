import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 에셋 압축 활성화
  compress: true,
  experimental: {
    // 대형 패키지 트리쉐이킹 최적화
    optimizePackageImports: [
      "@notionhq/client",
      "@anthropic-ai/sdk",
    ],
  },
};

export default nextConfig;
