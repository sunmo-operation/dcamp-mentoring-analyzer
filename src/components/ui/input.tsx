import * as React from "react"

import { cn } from "@/lib/utils"

// 토스 스타일 인풋: 둥근 모서리, 넉넉한 높이, 깨끗한 배경
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "placeholder:text-muted-foreground selection:bg-primary/20 selection:text-foreground border-0 bg-muted h-12 w-full min-w-0 rounded-2xl px-4 py-3 text-[15px] font-normal transition-all duration-200 outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-40",
        "focus:bg-card focus:ring-2 focus:ring-primary/20 focus:shadow-[0_0_0_4px_rgba(49,130,246,0.08)]",
        "aria-invalid:ring-destructive/20 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Input }
