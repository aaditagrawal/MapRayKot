import { cn } from "@/lib/utils"

type Props = {
  country: string
  km: number
  inside: boolean
  points: number
  missed?: boolean
}

function formatKm(km: number): string {
  if (km < 10) return `${km.toFixed(1)} km`
  if (km < 100) return `${km.toFixed(0)} km`
  return `${Math.round(km).toLocaleString()} km`
}

export function RoundFeedback({ country, km, inside, points, missed }: Props) {
  const tone = missed
    ? "muted"
    : inside
      ? "good"
      : points >= 500
        ? "good"
        : points >= 100
          ? "mid"
          : "bad"
  const toneCls =
    tone === "good"
      ? "border-[color-mix(in_oklab,var(--color-map-correct)_60%,transparent)] bg-[color-mix(in_oklab,var(--color-map-correct)_10%,transparent)]"
      : tone === "mid"
        ? "border-primary/40 bg-primary/[0.05]"
        : tone === "bad"
          ? "border-destructive/40 bg-destructive/[0.05]"
          : "border-border/70 bg-muted/20"

  return (
    <div className={cn("border p-4 space-y-2", toneCls)}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          {missed ? "Time up" : inside ? "Inside" : "Distance"}
        </span>
        <span className="text-xs text-muted-foreground">{country}</span>
      </div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-2xl font-semibold tabular-nums">
          {missed ? "—" : inside ? "Bull's-eye" : formatKm(km)}
        </span>
        <span
          className={cn(
            "text-xl font-semibold tabular-nums",
            points > 0 ? "text-foreground" : "text-muted-foreground"
          )}
        >
          +{points}
        </span>
      </div>
    </div>
  )
}
