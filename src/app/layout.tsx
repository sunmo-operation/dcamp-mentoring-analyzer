import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/layout/header";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: "AI Mentoring Analyzer",
  description:
    "멘토링 원문을 AI로 분석하여 근본 과제와 액션을 도출하는 내부 도구",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="font-sans antialiased">
        <Providers>
          <Header />
          <main className="min-h-[calc(100vh-64px)]">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
