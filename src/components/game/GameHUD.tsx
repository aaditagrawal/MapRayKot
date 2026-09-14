import type { CSSProperties } from "react"
import { cn } from "@/lib/utils"

type Stat = {
  label: string
  value: string
  /** Render in primary color. */
  accent?: boolean
  /** Render as a full-width header row (e.g. long country names that mustn't truncate). */
  wide?: boolean
}

type Props = {
  stats: Array<Stat>
  timerPct?: number | null
  className?: string
}

export function GameHUD({ stats, timerPct, className }: Props) {
  const wide = stats.filter((s) => s.wide)
  const inline = stats.filter((s) => !s.wide)
  // SAFETY: React style objects accept CSS custom properties; csstype's CSSProperties lacks an index signature for them.
  const timerFill = {
    "--timer-fill": `${Math.max(0, Math.min(100, timerPct ?? 0))}%`,
  } as CSSProperties

  return (
    <div className={cn("border-y border-border bg-card", className)}>
      {timerPct != null && (
        <div className="h-px w-full bg-border/60">
          <div
            className="h-full w-(--timer-fill) bg-primary transition-width duration-100 ease-linear"
            style={timerFill}
          />
        </div>
      )}
      {wide.map((s) => (
        <div
          key={s.label}
          className="border-b border-border/60 px-5 py-4 last:border-b-0"
        >
          <div className="text-xs tracking-label text-muted-foreground uppercase">
            {s.label}
          </div>
          <div
            className={cn(
              "mt-1.5 font-serif text-3xl leading-tight font-normal text-balance md:text-4xl",
              s.accent && "text-primary italic"
            )}
          >
            {s.value}
          </div>
        </div>
      ))}
      {inline.length > 0 && (
        <div className="grid grid-cols-stats divide-x divide-border">
          {inline.map((s) => (
            <div key={s.label} className="px-5 py-3.5">
              <div className="text-xs tracking-label text-muted-foreground uppercase">
                {s.label}
              </div>
              <div
                className={cn(
                  "mt-1.5 truncate font-serif text-2xl leading-none font-normal tabular-nums md:text-3xl",
                  s.accent && "text-primary italic"
                )}
              >
                {s.value}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
