import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

// 토스 스타일 버튼: 둥근 모서리(16px), 최소 높이 48px, 부드러운 hover 전환
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl text-sm font-semibold transition-all duration-200 ease-out disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-ring/30 focus-visible:ring-[3px] cursor-pointer",
  {
    variants: {
      variant: {
        // 기본: 토스 블루
        default:
          "bg-primary text-primary-foreground hover:bg-[#1B6EF3] hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(49,130,246,0.3)] active:translate-y-0 active:shadow-none",
        // 위험: 레드
        destructive:
          "bg-destructive text-white hover:bg-[#D92D3A] hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(240,68,82,0.3)] active:translate-y-0",
        // 아웃라인: 회색 테두리
        outline:
          "border border-border bg-card text-foreground hover:bg-muted hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] active:translate-y-0",
        // 세컨더리: 연한 블루 배경
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-[#D4E8FF] hover:-translate-y-0.5 active:translate-y-0",
        // 고스트: 배경 없음
        ghost:
          "text-muted-foreground hover:bg-muted hover:text-foreground",
        // 링크
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        // 기본: 모바일 터치 대응 48px
        default: "h-12 px-6 py-3 text-[15px]",
        xs: "h-7 gap-1 rounded-xl px-2.5 text-xs",
        sm: "h-9 rounded-xl gap-1.5 px-4 text-[13px]",
        lg: "h-14 rounded-2xl px-8 text-base",
        icon: "size-12 rounded-2xl",
        "icon-xs": "size-7 rounded-xl [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-9 rounded-xl",
        "icon-lg": "size-14 rounded-2xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
