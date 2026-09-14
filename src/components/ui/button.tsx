import { classNames } from "@/ui.stylex"
import * as React from "react"
import { cva } from "class-variance-authority"
import { Slot } from "radix-ui"
import type { VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(classNames.componentsUiButton70, {
  variants: {
    variant: {
      default: classNames.componentsUiBadge64,
      outline: classNames.componentsUiButton71,
      secondary: classNames.componentsUiButton72,
      ghost: classNames.componentsUiButton73,
      destructive: classNames.componentsUiButton74,
      link: classNames.componentsUiBadge69,
    },
    size: {
      default: classNames.componentsUiButton75,
      xs: classNames.componentsUiButton76,
      sm: classNames.componentsUiButton77,
      lg: classNames.componentsUiButton78,
      icon: classNames.componentsUiButton79,
      "icon-xs": classNames.componentsUiButton80,
      "icon-sm": classNames.componentsUiButton81,
      "icon-lg": classNames.componentsUiButton82,
    },
  },
  defaultVariants: {
    variant: "default",
    size: "default",
  },
})

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
