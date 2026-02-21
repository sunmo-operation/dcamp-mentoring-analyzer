import * as React from "react"

import { cn } from "@/lib/utils"

// 토스 스타일 텍스트에어리어: 둥근 모서리, 깨끗한 배경
function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "placeholder:text-muted-foreground border-0 bg-muted flex field-sizing-content min-h-[120px] w-full rounded-2xl px-4 py-3 text-[15px] font-normal transition-all duration-200 outline-none disabled:cursor-not-allowed disabled:opacity-40",
        "focus:bg-card focus:ring-2 focus:ring-primary/20 focus:shadow-[0_0_0_4px_rgba(49,130,246,0.08)]",
        "aria-invalid:ring-destructive/20 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
