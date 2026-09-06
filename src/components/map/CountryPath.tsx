import { classNames } from "@/ui.stylex"
import { memo } from "react"

type Variant = "idle" | "hover" | "target" | "correct" | "wrong" | "dim"

const FILL = {
  idle: "var(--color-map-land)",
  hover: "var(--color-map-land-hover)",
  target: "var(--color-map-target)",
  correct: "var(--color-map-correct)",
  wrong: "var(--color-map-wrong)",
  dim: "color-mix(in oklab, var(--color-map-land) 70%, var(--color-map-ocean) 30%)",
} satisfies Record<Variant, string>

type Props = {
  d: string
  variant: Variant
  interactive?: boolean
  onHover?: (hovering: boolean) => void
}

function CountryPathBase({ d, variant, interactive, onHover }: Props) {
  return (
    <path
      d={d}
      fill={FILL[variant]}
      stroke="var(--color-map-stroke)"
      strokeWidth={0.5}
      vectorEffect="non-scaling-stroke"
      className={
        interactive
          ? classNames.componentsMapCountryPath52
          : classNames.componentsMapCountryPath53
      }
      pointerEvents={interactive ? "auto" : "none"}
      onPointerEnter={interactive && onHover ? () => onHover(true) : undefined}
      onPointerLeave={interactive && onHover ? () => onHover(false) : undefined}
    />
  )
}

export const CountryPath = memo(CountryPathBase)
