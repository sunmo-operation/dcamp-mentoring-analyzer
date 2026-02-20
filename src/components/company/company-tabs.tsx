"use client";

import { useSearchParams } from "next/navigation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { ReactNode } from "react";

interface CompanyTabsProps {
  mentoringTab: ReactNode;
  timelineTab: ReactNode;
  analysisTab: ReactNode;
}

export function CompanyTabs({
  mentoringTab,
  timelineTab,
  analysisTab,
}: CompanyTabsProps) {
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get("tab") || "mentoring";

  return (
    <Tabs defaultValue={defaultTab}>
      <TabsList variant="line" className="w-full justify-start">
        <TabsTrigger value="mentoring">멘토링 기록</TabsTrigger>
        <TabsTrigger value="timeline">타임라인</TabsTrigger>
        <TabsTrigger value="analysis">AI 분석 이력</TabsTrigger>
      </TabsList>

      <TabsContent value="mentoring" className="mt-6">
        {mentoringTab}
      </TabsContent>

      <TabsContent value="timeline" className="mt-6">
        {timelineTab}
      </TabsContent>

      <TabsContent value="analysis" className="mt-6">
        {analysisTab}
      </TabsContent>
    </Tabs>
  );
}
