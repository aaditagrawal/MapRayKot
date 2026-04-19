const KEY_PREFIX = "maprayot:"
const HISTORY_CAP = 20

function isClient(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined"
}

export function readJSON<T>(key: string, fallback: T): T {
  if (!isClient()) return fallback
  try {
    const raw = window.localStorage.getItem(KEY_PREFIX + key)
    if (raw == null) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function writeJSON<T>(key: string, value: T): void {
  if (!isClient()) return
  try {
    window.localStorage.setItem(KEY_PREFIX + key, JSON.stringify(value))
  } catch {
    /* quota / private mode */
  }
}

export type LocateRun = {
  score: number
  turns: number
  perTurn: number
  at: number
}

export type NameRun = {
  score: number
  correct: number
  skipped: number
  totalSeconds: number
  at: number
}

export type LocateBest = LocateRun
export type NameBest = NameRun

function pushRun<T extends { score: number; at: number }>(
  key: string,
  legacyKey: string,
  run: T
): Array<T> {
  const existing = readJSON<Array<T>>(key, [])
  const seeded =
    existing.length === 0 ? maybeSeedFromLegacy<T>(legacyKey) : existing
  const next = [...seeded, run]
    .sort((a, b) => b.score - a.score || b.at - a.at)
    .slice(0, HISTORY_CAP)
  writeJSON(key, next)
  return next
}

function maybeSeedFromLegacy<T>(legacyKey: string): Array<T> {
  const legacy = readJSON<T | null>(legacyKey, null)
  return legacy ? [legacy] : []
}

function readHistory<T extends { score: number; at: number }>(
  key: string,
  legacyKey: string
): Array<T> {
  const list = readJSON<Array<T>>(key, [])
  if (list.length > 0) return list
  return maybeSeedFromLegacy<T>(legacyKey)
}

export function historyLocate(): Array<LocateRun> {
  return readHistory<LocateRun>("history-locate", "best-locate")
}

export function historyName(): Array<NameRun> {
  return readHistory<NameRun>("history-name", "best-name")
}

export function bestLocate(): LocateRun | null {
  return historyLocate()[0] ?? null
}

export function bestName(): NameRun | null {
  return historyName()[0] ?? null
}

export function saveLocateBest(next: LocateRun): LocateRun {
  const list = pushRun<LocateRun>("history-locate", "best-locate", next)
  return list[0] ?? next
}

export function saveNameBest(next: NameRun): NameRun {
  const list = pushRun<NameRun>("history-name", "best-name", next)
  return list[0] ?? next
}
