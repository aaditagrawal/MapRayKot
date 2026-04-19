/**
 * Diacritic-insensitive normalization + matching for country names.
 */
import type { Country } from "./countries"

export function normalize(s: string): string {
  let out = s.normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
  out = out.toLowerCase()
  out = out.replace(/[’'`]/g, "")
  out = out.replace(/[^a-z0-9]+/g, " ").trim()
  if (out.startsWith("the ")) out = out.slice(4)
  return out
}

export function isMatch(query: string, country: Country): boolean {
  const q = normalize(query)
  if (!q) return false
  return country.matchSet.includes(q)
}

/** Rank countries for autocomplete. startsWith > includes > none. */
export function rankForSearch(query: string, countries: ReadonlyArray<Country>): Array<Country> {
  const q = normalize(query)
  if (!q) return []
  const starts: Array<Country> = []
  const contains: Array<Country> = []
  for (const c of countries) {
    let bucket: 0 | 1 | 2 = 0
    for (const m of c.matchSet) {
      if (m.startsWith(q)) {
        bucket = 1
        break
      }
      if (m.includes(q)) bucket = 2
    }
    if (bucket === 1) starts.push(c)
    else if (bucket === 2) contains.push(c)
  }
  return [...starts, ...contains].slice(0, 8)
}
