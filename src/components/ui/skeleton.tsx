import { cn } from "@/lib/utils"
import { ReactElement, ReactNode } from "react"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("bg-accent animate-pulse rounded-md", className)}
      {...props}
    />
  )
}

interface WithSkeletonProps {
  children: ReactNode
  isLoading: boolean
}

function WithSkeleton({ children, isLoading }: WithSkeletonProps): ReactElement {
  if (isLoading) {
    return <>{children}</>
  }
  return <>{children}</>
}

export { Skeleton, WithSkeleton }
