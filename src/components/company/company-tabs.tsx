"use client";

import { useSearchParams } from "next/navigation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { ReactNode } from "react";

interface CompanyTabsProps {
  mentoringTab: ReactNode;
  pulseTab: ReactNode;
}

export function CompanyTabs({
  mentoringTab,
  pulseTab,
}: CompanyTabsProps) {
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get("tab") || "pulse";

  return (
    <Tabs defaultValue={defaultTab}>
      <TabsList variant="line" className="w-full justify-start">
        <TabsTrigger value="pulse">배치 타임라인</TabsTrigger>
        <TabsTrigger value="mentoring">멘토링 기록</TabsTrigger>
      </TabsList>

      <TabsContent value="pulse" className="mt-6">
        {pulseTab}
      </TabsContent>

      <TabsContent value="mentoring" className="mt-6">
        {mentoringTab}
      </TabsContent>
    </Tabs>
  );
}
