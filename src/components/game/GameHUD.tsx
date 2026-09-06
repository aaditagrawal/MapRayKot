import { classNames } from "@/ui.stylex"
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
    <div className={cn(classNames.componentsGameGameHUD6, className)}>
      {timerPct != null && (
        <div className={classNames.componentsGameGameHUD7}>
          <div
            className={classNames.componentsGameGameHUD8}
            style={{ width: `${Math.max(0, Math.min(100, timerPct))}%` }}
          />
        </div>
      )}
      {wide.map((s) => (
        <div key={s.label} className={classNames.componentsGameGameHUD9}>
          <div className={classNames.componentsGameGameHUD10}>{s.label}</div>
          <div
            className={cn(
              classNames.componentsGameGameHUD11,
              s.accent && classNames.componentsGameGameHUD12
            )}
          >
            {s.value}
          </div>
        </div>
      ))}
      {inline.length > 0 && (
        <div className={classNames.componentsGameGameHUD13}>
          {inline.map((s) => (
            <div key={s.label} className={classNames.componentsGameGameHUD14}>
              <div className={classNames.componentsGameGameHUD10}>
                {s.label}
              </div>
              <div
                className={cn(
                  classNames.componentsGameGameHUD15,
                  s.accent && classNames.componentsGameGameHUD12
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
