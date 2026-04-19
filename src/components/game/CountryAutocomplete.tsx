import { useEffect, useMemo, useRef, useState } from "react"
import type { Country } from "@/lib/countries"
import { Input } from "@/components/ui/input"
import { isMatch, rankForSearch } from "@/lib/match"
import { cn } from "@/lib/utils"

type Props = {
  /** Remaining pool of countries that are still valid submissions. */
  pool: ReadonlyArray<Country>
  /** Called with the matched country when the user types (or selects) a valid name. */
  onSolve: (country: Country) => void
  /** Disables input (e.g. during brief reveal animation). */
  disabled?: boolean
  /** Auto-focus on mount and after each solve (clears + refocuses). */
  autoFocus?: boolean
  placeholder?: string
}

export function CountryAutocomplete({
  pool,
  onSolve,
  disabled,
  autoFocus = true,
  placeholder = "Type a country…",
}: Props) {
  const [value, setValue] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  const suggestions = useMemo(
    () => rankForSearch(value, pool).slice(0, 5),
    [value, pool]
  )

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus()
  }, [autoFocus])

  const commit = (q: string) => {
    if (!q.trim()) return
    for (const c of pool) {
      if (isMatch(q, c)) {
        onSolve(c)
        setValue("")
        inputRef.current?.focus()
        return
      }
    }
  }

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => {
          const next = e.target.value
          setValue(next)
          // auto-submit when typed value exactly matches an alias
          for (const c of pool) {
            if (isMatch(next, c)) {
              onSolve(c)
              setValue("")
              return
            }
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault()
            // Take first suggestion if available, else try raw commit
            if (suggestions[0]) {
              onSolve(suggestions[0])
              setValue("")
            } else {
              commit(value)
            }
          }
        }}
        disabled={disabled}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        placeholder={placeholder}
        className="h-12 text-base"
      />
      {suggestions.length > 0 && value.trim() && (
        <div className="absolute inset-x-0 top-full z-20 mt-1 border bg-popover text-popover-foreground shadow-sm">
          {suggestions.map((c) => (
            <button
              key={c.id}
              type="button"
              className={cn(
                "flex w-full items-center justify-between px-3 py-2 text-left text-sm",
                "hover:bg-accent/10 focus:bg-accent/10 focus:outline-none"
              )}
              onClick={() => {
                onSolve(c)
                setValue("")
                inputRef.current?.focus()
              }}
            >
              <span>{c.name}</span>
              <span className="text-xs text-muted-foreground">{c.iso3}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
