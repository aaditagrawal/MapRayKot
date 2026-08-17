const KEY_PREFIX = "maprayot:"
const HISTORY_CAP = 20

function isClient(): boolean {
  return "localStorage" in globalThis
}

/**
 * Raw JSON read. localStorage is user-editable and survives schema changes, so
 * the result is untrusted — decode it before letting it reach the UI.
 */
function readStored(key: string) {
  if (!isClient()) return null
  try {
    const raw = window.localStorage.getItem(KEY_PREFIX + key)
    return raw == null ? null : JSON.parse(raw)
  } catch {
    return null
  }
}

function writeStored(
  key: string,
  value: Array<LocateRun> | Array<NameRun>
): void {
  if (!isClient()) return
  try {
    window.localStorage.setItem(KEY_PREFIX + key, JSON.stringify(value))
  } catch {
    /* quota / private mode */
  }
}

/**
 * The stored entries for `key`, falling back to the pre-history single-best
 * `legacyKey` when no history exists yet. Entries are still undecoded here.
 */
function storedEntries(key: string, legacyKey: string) {
  const stored = readStored(key)
  if (Array.isArray(stored) && stored.length > 0) return stored
  const legacy = readStored(legacyKey)
  return legacy == null ? [] : [legacy]
}

/**
 * Accepts a stored field only when it already is a finite JSON number.
 * `Number.isFinite` does not coerce, so `null`, `""` and `true` are rejected
 * rather than silently becoming 0 or 1.
 */
function finiteOrNull(
  value: boolean | number | string | null | undefined
): number | null {
  return Number.isFinite(value) ? Number(value) : null
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

function byScoreThenRecency<T extends { score: number; at: number }>(
  a: T,
  b: T
): number {
  return b.score - a.score || b.at - a.at
}

export function historyLocate(): Array<LocateRun> {
  const runs: Array<LocateRun> = []
  for (const entry of storedEntries("history-locate", "best-locate")) {
    const score = finiteOrNull(entry?.score)
    const turns = finiteOrNull(entry?.turns)
    const perTurn = finiteOrNull(entry?.perTurn)
    const at = finiteOrNull(entry?.at)
    if (score === null || turns === null || perTurn === null || at === null) {
      continue
    }
    runs.push({ score, turns, perTurn, at })
  }
  return runs.sort(byScoreThenRecency)
}

export function historyName(): Array<NameRun> {
  const runs: Array<NameRun> = []
  for (const entry of storedEntries("history-name", "best-name")) {
    const score = finiteOrNull(entry?.score)
    const correct = finiteOrNull(entry?.correct)
    const skipped = finiteOrNull(entry?.skipped)
    const totalSeconds = finiteOrNull(entry?.totalSeconds)
    const at = finiteOrNull(entry?.at)
    if (
      score === null ||
      correct === null ||
      skipped === null ||
      totalSeconds === null ||
      at === null
    ) {
      continue
    }
    runs.push({ score, correct, skipped, totalSeconds, at })
  }
  return runs.sort(byScoreThenRecency)
}

export function bestLocate(): LocateRun | null {
  return historyLocate()[0] ?? null
}

export function bestName(): NameRun | null {
  return historyName()[0] ?? null
}

export function saveLocateBest(next: LocateRun): LocateRun {
  const list = [...historyLocate(), next]
    .sort(byScoreThenRecency)
    .slice(0, HISTORY_CAP)
  writeStored("history-locate", list)
  return list[0] ?? next
}

export function saveNameBest(next: NameRun): NameRun {
  const list = [...historyName(), next]
    .sort(byScoreThenRecency)
    .slice(0, HISTORY_CAP)
  writeStored("history-name", list)
  return list[0] ?? next
}
