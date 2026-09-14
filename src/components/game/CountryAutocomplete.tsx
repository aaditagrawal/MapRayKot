import { classNames } from "@/ui.stylex"
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
    <div className={classNames.componentsGameCountryAutocomplete0}>
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
        className={classNames.componentsGameCountryAutocomplete1}
      />
      {suggestions.length > 0 && value.trim() && (
        <div className={classNames.componentsGameCountryAutocomplete2}>
          {suggestions.map((c) => (
            <button
              key={c.id}
              type="button"
              className={cn(
                classNames.componentsGameCountryAutocomplete3,
                classNames.componentsGameCountryAutocomplete4
              )}
              onClick={() => {
                onSolve(c)
                setValue("")
                inputRef.current?.focus()
              }}
            >
              <span>{c.name}</span>
              <span className={classNames.componentsGameCountryAutocomplete5}>
                {c.iso3}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
