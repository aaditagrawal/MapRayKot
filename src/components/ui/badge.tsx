import { classNames } from "@/ui.stylex"
import * as React from "react"
import { cva } from "class-variance-authority"
import { Slot } from "radix-ui"
import type { VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(classNames.componentsUiBadge63, {
  variants: {
    variant: {
      default: classNames.componentsUiBadge64,
      secondary: classNames.componentsUiBadge65,
      destructive: classNames.componentsUiBadge66,
      outline: classNames.componentsUiBadge67,
      ghost: classNames.componentsUiBadge68,
      link: classNames.componentsUiBadge69,
    },
  },
  defaultVariants: {
    variant: "default",
  },
})

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
