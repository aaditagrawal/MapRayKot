import { classNames } from "@/ui.stylex"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type Choice = { label: string; value: number }

type Props = {
  title: string
  description: string
  groups: Array<{
    key: string
    label: string
    choices: Array<Choice>
    defaultValue: number
    unit: string
    min: number
    max: number
  }>
  ctaLabel: string
  onStart: (values: Record<string, number>) => void
}

/** Splits "Locate mode" → ["Locate", "mode"] so the first word can render as italic primary. */
function splitTitle(t: string): [string, string] {
  const i = t.indexOf(" ")
  if (i === -1) return [t, ""]
  return [t.slice(0, i), t.slice(i + 1)]
}

export function SessionConfig({
  title,
  description,
  groups,
  ctaLabel,
  onStart,
}: Props) {
  const [values, setValues] = useState<Record<string, number>>(() => {
    const seed: Record<string, number> = {}
    for (const g of groups) seed[g.key] = g.defaultValue
    return seed
  })
  const [custom, setCustom] = useState<Record<string, boolean>>({})

  const [accent, rest] = splitTitle(title)

  return (
    <div className={classNames.componentsGameSessionConfig27}>
      <header className={classNames.componentsGameSessionConfig28}>
        <span className={classNames.componentsGameSessionConfig29}>
          <span className={classNames.componentsGameSessionConfig30} />
          New session
        </span>
        <h2 className={classNames.componentsGameSessionConfig31}>
          <em className={classNames.componentsGameGameHUD12}>{accent}</em>
          {rest && ` ${rest}`}.
        </h2>
        <p className={classNames.componentsGameSessionConfig32}>
          {description}
        </p>
      </header>

      <div className={classNames.componentsGameSessionConfig33}>
        {groups.map((g, idx) => {
          const value = values[g.key]
          const isCustom = custom[g.key] ?? false
          return (
            <fieldset
              key={g.key}
              className={classNames.componentsGameSessionConfig34}
            >
              <div className={classNames.componentsGameSessionConfig35}>
                <legend className={classNames.componentsGameSessionConfig36}>
                  <span className={classNames.componentsGameSessionConfig37}>
                    {`${String(idx + 1).padStart(2, "0")}.`}
                  </span>
                  <span className={classNames.componentsGameSessionConfig38}>
                    {g.label}
                  </span>
                </legend>
                <span className={classNames.componentsGameSessionConfig39}>
                  {value}
                  <span className={classNames.componentsGameSessionConfig40}>
                    {g.unit}
                  </span>
                </span>
              </div>
              <div className={classNames.componentsGameSessionConfig41}>
                {g.choices.map((c) => {
                  const active = !isCustom && value === c.value
                  return (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => {
                        setValues((v) => ({ ...v, [g.key]: c.value }))
                        setCustom((cu) => ({ ...cu, [g.key]: false }))
                      }}
                      className={cn(
                        classNames.componentsGameSessionConfig42,
                        active
                          ? classNames.componentsGameSessionConfig43
                          : classNames.componentsGameSessionConfig44
                      )}
                    >
                      {c.label}
                    </button>
                  )
                })}
                <button
                  type="button"
                  onClick={() =>
                    setCustom((cu) => ({ ...cu, [g.key]: !cu[g.key] }))
                  }
                  className={cn(
                    classNames.componentsGameSessionConfig42,
                    isCustom
                      ? classNames.componentsGameSessionConfig43
                      : classNames.componentsGameSessionConfig44
                  )}
                >
                  Custom
                </button>
              </div>
              {isCustom && (
                <Input
                  type="number"
                  min={g.min}
                  max={g.max}
                  value={value}
                  onChange={(e) => {
                    const n = Number(e.target.value)
                    if (Number.isFinite(n)) {
                      setValues((v) => ({
                        ...v,
                        [g.key]: Math.min(
                          g.max,
                          Math.max(g.min, Math.round(n))
                        ),
                      }))
                    }
                  }}
                  className={classNames.componentsGameSessionConfig45}
                />
              )}
            </fieldset>
          )
        })}
      </div>

      <div className={classNames.componentsGameSessionConfig46}>
        <Button
          size="lg"
          className={classNames.componentsGameSessionConfig47}
          onClick={() => onStart(values)}
        >
          <span>{ctaLabel}</span>
          <span
            aria-hidden
            className={classNames.componentsGameSessionConfig48}
          >
            →
          </span>
        </Button>
      </div>
    </div>
  )
}
