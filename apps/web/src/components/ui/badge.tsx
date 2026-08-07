import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-4xl border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default:
          "rounded-full bg-action-soft px-2.5 py-1 text-xs font-semibold text-action [a]:hover:bg-action-soft/80",
        secondary:
          "rounded-full bg-surface-muted px-2.5 py-1 text-xs font-semibold text-muted [a]:hover:bg-surface-muted/80",
        destructive:
          "rounded-full bg-danger-soft px-2.5 py-1 text-xs font-semibold text-danger focus-visible:ring-danger/20 [a]:hover:bg-danger-soft/80",
        success:
          "rounded-full bg-success-soft px-2.5 py-1 text-xs font-semibold text-success",
        review:
          "rounded-full bg-review-soft px-2.5 py-1 text-xs font-semibold text-review",
        outline:
          "rounded-full border-border text-ink [a]:hover:bg-surface-muted [a]:hover:text-muted",
        ghost: "rounded-full hover:bg-surface-muted hover:text-muted",
        link: "text-action underline-offset-4 hover:underline",
        glass:
          "glass-surface rounded-full px-2.5 py-1 text-xs font-semibold text-ink",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
