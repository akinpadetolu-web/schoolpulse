import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[inset_0_1px_0_0_rgba(255,255,255,0.3),0_1px_2px_rgba(15,23,42,0.18),0_4px_12px_-4px_rgba(37,99,235,0.5)] hover:bg-primary/90 hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.35),0_2px_4px_rgba(15,23,42,0.2),0_8px_20px_-6px_rgba(37,99,235,0.55)]",
        destructive:
          "bg-destructive text-destructive-foreground shadow-[inset_0_1px_0_0_rgba(255,255,255,0.28),0_1px_2px_rgba(15,23,42,0.18)] hover:bg-destructive/90",
        outline:
          "border border-white/60 bg-card/75 backdrop-blur-sm text-foreground shadow-[inset_0_1px_0_0_rgba(255,255,255,0.85),0_1px_2px_rgba(15,23,42,0.06)] hover:bg-slate-100 hover:text-foreground",
        secondary:
          "border border-white/60 bg-slate-100/80 backdrop-blur-sm text-slate-700 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.8),0_1px_2px_rgba(15,23,42,0.05)] hover:bg-slate-200",
        ghost: "hover:bg-slate-100/70 hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-lg px-3 text-xs",
        lg: "h-10 rounded-xl px-8",
        icon: "h-9 w-9 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const Button = React.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button"
  return (
    (<Comp
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props} />)
  );
})
Button.displayName = "Button"

export { Button, buttonVariants }