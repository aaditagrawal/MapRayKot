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

  return (
    <div className={cn("border-y border-border bg-card", className)}>
      {timerPct != null && (
        <div className="h-px w-full bg-border/60">
          <div
            className="h-full bg-primary transition-[width] duration-100 ease-linear"
            style={{ width: `${Math.max(0, Math.min(100, timerPct))}%` }}
          />
        </div>
      )}
      {wide.map((s) => (
        <div
          key={s.label}
          className="border-b border-border/60 px-5 py-4 last:border-b-0"
        >
          <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            {s.label}
          </div>
          <div
            className={cn(
              "mt-1.5 font-serif text-3xl font-normal leading-tight text-balance md:text-4xl",
              s.accent && "italic text-primary"
            )}
          >
            {s.value}
          </div>
        </div>
      ))}
      {inline.length > 0 && (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))] divide-x divide-border">
          {inline.map((s) => (
            <div key={s.label} className="px-5 py-3.5">
              <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                {s.label}
              </div>
              <div
                className={cn(
                  "mt-1.5 truncate font-serif text-2xl font-normal tabular-nums leading-none md:text-3xl",
                  s.accent && "italic text-primary"
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
