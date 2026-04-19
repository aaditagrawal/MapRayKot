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

  return (
    <div className="space-y-8 border bg-card p-6">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="space-y-6">
        {groups.map((g) => {
          const value = values[g.key]
          const isCustom = custom[g.key] ?? false
          return (
            <div key={g.key} className="space-y-2">
              <div className="flex items-baseline justify-between">
                <label className="text-sm font-medium">{g.label}</label>
                <span className="text-xs text-muted-foreground">
                  {value} {g.unit}
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
                        "h-9 min-w-[3.5rem] border px-3 text-sm transition-colors",
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border hover:bg-accent/10"
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
                    "h-9 min-w-[3.5rem] border px-3 text-sm transition-colors",
                    isCustom
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border hover:bg-accent/10"
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
            </div>
          )
        })}
      </div>
      <Button size="lg" className="w-full" onClick={() => onStart(values)}>
        {ctaLabel}
      </Button>
    </div>
  )
}
