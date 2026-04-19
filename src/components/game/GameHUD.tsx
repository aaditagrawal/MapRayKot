import { cn } from "@/lib/utils"

type Stat = { label: string; value: string; accent?: boolean }

type Props = {
  stats: Array<Stat>
  timerPct?: number | null
  className?: string
}

export function GameHUD({ stats, timerPct, className }: Props) {
  return (
    <div className={cn("border bg-card", className)}>
      {timerPct != null && (
        <div className="h-0.5 w-full bg-muted">
          <div
            className="h-full bg-primary transition-[width] duration-100 ease-linear"
            style={{ width: `${Math.max(0, Math.min(100, timerPct))}%` }}
          />
        </div>
      )}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))] divide-x divide-border">
        {stats.map((s) => (
          <div key={s.label} className="px-4 py-3">
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              {s.label}
            </div>
            <div
              className={cn(
                "mt-1 text-xl font-semibold tabular-nums",
                s.accent && "text-primary"
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
