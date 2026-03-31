"use client";

import { SWRProvider } from "@/lib/swr-provider";
import type { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return <SWRProvider>{children}</SWRProvider>;
}
