import { cn } from "@/lib/utils"

type Stat = { label: string; value: string; accent?: boolean }

type Props = {
  stats: Array<Stat>
  timerPct?: number | null
  className?: string
}

export function GameHUD({ stats, timerPct, className }: Props) {
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
      <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] divide-x divide-border">
        {stats.map((s) => (
          <div key={s.label} className="px-5 py-4">
            <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              {s.label}
            </div>
            <div
              className={cn(
                "mt-2 truncate font-serif text-2xl font-normal tabular-nums leading-none md:text-3xl",
                s.accent && "italic text-primary"
              )}
            >
              {s.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
