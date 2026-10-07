import * as React from "react"
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-sky-400/25 bg-sky-400/15 text-sky-200 backdrop-blur-xl",
        secondary:
          "border-white/12 bg-white/[0.08] text-foreground backdrop-blur-xl",
        destructive:
          "border-rose-400/25 bg-rose-500/15 text-rose-200 backdrop-blur-xl",
        outline: "border-white/15 text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  ...props
}) {
  return (<div className={cn(badgeVariants({ variant }), className)} {...props} />);
}

export { Badge, badgeVariants }