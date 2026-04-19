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
    <div className="space-y-12 py-4 md:py-8">
      <header className="space-y-5">
        <span className="inline-flex items-center gap-3 text-[10px] uppercase tracking-[0.4em] text-muted-foreground">
          <span className="h-px w-6 bg-border" />
          New session
        </span>
        <h2 className="font-serif text-4xl font-normal leading-[1.05] tracking-tight md:text-5xl">
          <em className="italic text-primary">{accent}</em>
          {rest && ` ${rest}`}.
        </h2>
        <p className="max-w-prose text-sm leading-relaxed text-muted-foreground md:text-base">
          {description}
        </p>
      </header>

      <div className="space-y-10 border-t border-border pt-10">
        {groups.map((g, idx) => {
          const value = values[g.key]
          const isCustom = custom[g.key] ?? false
          return (
            <fieldset key={g.key} className="space-y-4">
              <div className="flex items-baseline justify-between gap-4">
                <legend className="flex items-baseline gap-3">
                  <span className="font-serif text-xl italic text-muted-foreground/70">
                    {`${String(idx + 1).padStart(2, "0")}.`}
                  </span>
                  <span className="text-sm font-medium tracking-tight">
                    {g.label}
                  </span>
                </legend>
                <span className="font-serif text-base tabular-nums text-muted-foreground">
                  {value}
                  <span className="ml-1 text-[10px] uppercase tracking-[0.2em]">
                    {g.unit}
                  </span>
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
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
                        "h-9 min-w-[3.25rem] border px-3 text-xs uppercase tracking-[0.18em] transition-colors",
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border text-muted-foreground hover:border-foreground/60 hover:text-foreground"
                      )}
                    >
                      {c.label}
                    </button>
                  )
                })}
                <button
                  type="button"
                  onClick={() => setCustom((cu) => ({ ...cu, [g.key]: !cu[g.key] }))}
                  className={cn(
                    "h-9 min-w-[3.25rem] border px-3 text-xs uppercase tracking-[0.18em] transition-colors",
                    isCustom
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground hover:border-foreground/60 hover:text-foreground"
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
                        [g.key]: Math.min(g.max, Math.max(g.min, Math.round(n))),
                      }))
                    }
                  }}
                  className="h-9 w-32"
                />
              )}
            </fieldset>
          )
        })}
      </div>

      <div className="border-t border-border pt-8">
        <Button
          size="lg"
          className="group/cta w-full justify-between text-xs uppercase tracking-[0.3em]"
          onClick={() => onStart(values)}
        >
          <span>{ctaLabel}</span>
          <span aria-hidden className="transition-transform group-hover/cta:translate-x-1">
            →
          </span>
        </Button>
      </div>
    </div>
  )
}
