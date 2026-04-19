import { ISO_META } from "../../scripts/iso-meta"
import { normalize } from "./match"

export type Country = {
  id: string
  iso2: string
  iso3: string
  name: string
  /** Normalized name + aliases, used as the submission match set. */
  matchSet: ReadonlyArray<string>
  /** Aliases as the user might type them (not normalized) — for display. */
  aliases: ReadonlyArray<string>
}

function buildCountries(): Array<Country> {
  const out: Array<Country> = []
  for (const [id, info] of Object.entries(ISO_META)) {
    const matchSet = new Set<string>()
    matchSet.add(normalize(info.name))
    for (const a of info.aliases) matchSet.add(normalize(a))
    out.push({
      id,
      iso2: info.iso2,
      iso3: info.iso3,
      name: info.name,
      aliases: info.aliases,
      matchSet: [...matchSet],
    })
  }
  return out.sort((a, b) => a.name.localeCompare(b.name))
}

export const COUNTRIES: ReadonlyArray<Country> = buildCountries()
export const COUNTRIES_BY_ID: ReadonlyMap<string, Country> = new Map(
  COUNTRIES.map((c) => [c.id, c])
)

export function randomCountries(n: number, rng: () => number = Math.random): Array<Country> {
  const pool = [...COUNTRIES]
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool.slice(0, Math.min(n, pool.length))
}

export function shuffle<T>(arr: ReadonlyArray<T>, rng: () => number = Math.random): Array<T> {
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}
