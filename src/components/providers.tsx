"use client";

import { SessionProvider } from "next-auth/react";
import { SWRProvider } from "@/lib/swr-provider";
import type { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <SWRProvider>{children}</SWRProvider>
    </SessionProvider>
  );
}
