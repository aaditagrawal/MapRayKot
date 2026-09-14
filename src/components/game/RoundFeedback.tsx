import { classNames } from "@/ui.stylex"
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
    good: classNames.componentsGameRoundFeedback16,
    mid: classNames.componentsGameRoundFeedback17,
    bad: classNames.componentsGameRoundFeedback18,
    muted: classNames.componentsGameRoundFeedback19,
  }[tone]

  const eyebrow = missed ? "Time up" : inside ? "Bull's-eye" : "Distance"
  const headline = missed ? "—" : inside ? "Inside the border" : formatKm(km)

  return (
    <div className={cn(classNames.componentsGameRoundFeedback20, toneCls)}>
      <div className={classNames.componentsGameRoundFeedback21}>
        <span className={classNames.componentsGameGameHUD10}>{eyebrow}</span>
        <span className={classNames.componentsGameRoundFeedback22}>
          {country}
        </span>
      </div>
      <div className={classNames.componentsGameRoundFeedback23}>
        <span className={classNames.componentsGameRoundFeedback24}>
          {headline}
        </span>
        <span
          className={cn(
            classNames.componentsGameRoundFeedback24,
            points > 0
              ? classNames.componentsGameRoundFeedback25
              : classNames.componentsGameRoundFeedback26
          )}
        >
          +{points}
        </span>
      </div>
    </div>
  )
}
