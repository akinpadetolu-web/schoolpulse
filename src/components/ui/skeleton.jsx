import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}) {
  return (
    (<div
      className={cn("sep-skeleton", className)}
      {...props} />)
  );
}

export { Skeleton }