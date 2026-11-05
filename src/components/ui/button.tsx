import { classNames } from "@/ui.stylex"
import type { ComponentProps } from "react"

import { cn } from "@/lib/utils"

const variants = {
  default: classNames.componentsUiBadge64,
  outline: classNames.componentsUiButton71,
  secondary: classNames.componentsUiButton72,
  ghost: classNames.componentsUiButton73,
  destructive: classNames.componentsUiButton74,
  link: classNames.componentsUiBadge69,
}

const sizes = {
  default: classNames.componentsUiButton75,
  xs: classNames.componentsUiButton76,
  sm: classNames.componentsUiButton77,
  lg: classNames.componentsUiButton78,
  icon: classNames.componentsUiButton79,
  "icon-xs": classNames.componentsUiButton80,
  "icon-sm": classNames.componentsUiButton81,
  "icon-lg": classNames.componentsUiButton82,
}

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ComponentProps<"button"> & {
  variant?: keyof typeof variants | null
  size?: keyof typeof sizes | null
}) {
  return (
    <button
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(
        classNames.componentsUiButton70,
        variant && variants[variant],
        size && sizes[size],
        className
      )}
      {...props}
    />
  )
}

export { Button }
