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
  const tone: "good" | "mid" | "bad" | "muted" = missed
    ? "muted"
    : inside || points >= 500
      ? "good"
      : points >= 100
        ? "mid"
        : "bad"
  const toneCls = {
    good:
      "border-[color-mix(in_oklab,var(--color-map-correct)_55%,transparent)] bg-[color-mix(in_oklab,var(--color-map-correct)_8%,transparent)]",
    mid: "border-primary/40 bg-primary/[0.04]",
    bad: "border-destructive/40 bg-destructive/[0.04]",
    muted: "border-border/70 bg-muted/20",
  }[tone]

  const eyebrow = missed ? "Time up" : inside ? "Bull's-eye" : "Distance"
  const headline = missed ? "—" : inside ? "Inside the border" : formatKm(km)

  return (
    <div className={cn("border p-5", toneCls)}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
          {eyebrow}
        </span>
        <span className="font-serif text-base italic text-muted-foreground">
          {country}
        </span>
      </div>
      <div className="mt-3 flex items-baseline justify-between gap-3">
        <span className="font-serif text-3xl font-normal tabular-nums leading-none md:text-4xl">
          {headline}
        </span>
        <span
          className={cn(
            "font-serif text-3xl font-normal tabular-nums leading-none md:text-4xl",
            points > 0 ? "text-primary" : "text-muted-foreground/70"
          )}
        >
          +{points}
        </span>
      </div>
    </div>
  )
}
