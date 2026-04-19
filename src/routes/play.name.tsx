import { Link, createFileRoute } from "@tanstack/react-router"
import { useEffect, useMemo, useRef, useState } from "react"
import type { Country } from "@/lib/countries"
import { WorldMap } from "@/components/map/WorldMap"
import { CountryInset } from "@/components/map/CountryInset"
import { GameHUD } from "@/components/game/GameHUD"
import { CountryAutocomplete } from "@/components/game/CountryAutocomplete"
import { SessionConfig } from "@/components/game/SessionConfig"
import { Button } from "@/components/ui/button"
import { COUNTRIES, shuffle } from "@/lib/countries"
import { saveNameBest } from "@/lib/storage"

export const Route = createFileRoute("/play/name")({ component: NamePage })

type RoundOutcome =
  | { kind: "solved"; country: Country }
  | { kind: "skipped"; country: Country }

type Phase =
  | { kind: "setup" }
  | {
      kind: "playing"
      queue: Array<Country>
      cursor: number
      totalMs: number
      startedAt: number
      solved: Array<Country>
      skipped: Array<Country>
      flash: { country: Country; until: number } | null
    }
  | {
      kind: "done"
      totalMs: number
      solved: Array<Country>
      skipped: Array<Country>
    }

function NamePage() {
  const [phase, setPhase] = useState<Phase>({ kind: "setup" })

  if (phase.kind === "setup") {
    return (
      <Shell>
        <SessionConfig
          title="Name mode"
          description="We highlight a country on the map and point to it. Type its name — +4 correct, −1 skip."
          ctaLabel="Start naming"
          groups={[
            {
              key: "minutes",
              label: "Session length",
              unit: "min",
              choices: [
                { label: "5m", value: 5 },
                { label: "10m", value: 10 },
                { label: "15m", value: 15 },
                { label: "30m", value: 30 },
              ],
              defaultValue: 10,
              min: 1,
              max: 120,
            },
          ]}
          onStart={({ minutes }) => {
            setPhase({
              kind: "playing",
              queue: shuffle(COUNTRIES),
              cursor: 0,
              totalMs: minutes * 60_000,
              startedAt: performance.now(),
              solved: [],
              skipped: [],
              flash: null,
            })
          }}
        />
      </Shell>
    )
  }

  if (phase.kind === "done") {
    return (
      <Shell>
        <Summary phase={phase} onPlayAgain={() => setPhase({ kind: "setup" })} />
      </Shell>
    )
  }

  return (
    <Shell>
      <Active phase={phase} setPhase={setPhase} />
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <nav className="mb-6 flex items-center gap-3 text-sm">
        <Link to="/" className="text-muted-foreground hover:text-foreground">
          ← Back
        </Link>
        <span className="text-muted-foreground">·</span>
        <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          Name
        </span>
      </nav>
      {children}
    </div>
  )
}

function Active({
  phase,
  setPhase,
}: {
  phase: Extract<Phase, { kind: "playing" }>
  setPhase: (p: Phase) => void
}) {
  const [tick, setTick] = useState(0)
  const endedRef = useRef(false)

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 200)
    return () => clearInterval(id)
  }, [])

  const elapsedMs = tick >= 0 ? performance.now() - phase.startedAt : 0
  const timerPct = Math.max(0, 100 - (elapsedMs / phase.totalMs) * 100)
  const remainingSec = Math.max(0, Math.ceil((phase.totalMs - elapsedMs) / 1000))

  // End of session
  useEffect(() => {
    if (endedRef.current) return
    if (elapsedMs < phase.totalMs) return
    endedRef.current = true
    saveNameBest({
      score: phase.solved.length * 4 - phase.skipped.length,
      correct: phase.solved.length,
      skipped: phase.skipped.length,
      totalSeconds: phase.totalMs / 1000,
      at: Date.now(),
    })
    setPhase({
      kind: "done",
      totalMs: phase.totalMs,
      solved: phase.solved,
      skipped: phase.skipped,
    })
  }, [tick, elapsedMs, phase, setPhase])

  const target = phase.queue[phase.cursor]

  // Clear transient flash after 500ms
  useEffect(() => {
    if (!phase.flash) return
    const ms = phase.flash.until - performance.now()
    if (ms <= 0) {
      setPhase({ ...phase, flash: null })
      return
    }
    const t = setTimeout(() => setPhase({ ...phase, flash: null }), ms)
    return () => clearTimeout(t)
  }, [phase, setPhase])

  const solvedIds = useMemo(
    () => new Set(phase.solved.map((c) => c.id)),
    [phase.solved]
  )
  const pool = useMemo(() => {
    const taken = new Set<string>([
      ...phase.solved.map((c) => c.id),
      ...phase.skipped.map((c) => c.id),
    ])
    return COUNTRIES.filter((c) => !taken.has(c.id))
  }, [phase.solved, phase.skipped])

  const advanceCursor = (outcome: RoundOutcome) => {
    const usedIds = new Set<string>([
      ...phase.solved.map((c) => c.id),
      ...phase.skipped.map((c) => c.id),
      outcome.country.id,
    ])
    const solved =
      outcome.kind === "solved" ? [...phase.solved, outcome.country] : phase.solved
    const skipped =
      outcome.kind === "skipped" ? [...phase.skipped, outcome.country] : phase.skipped
    let next = phase.cursor + 1
    while (next < phase.queue.length && usedIds.has(phase.queue[next].id)) {
      next++
    }
    if (next >= phase.queue.length) {
      saveNameBest({
        score: solved.length * 4 - skipped.length,
        correct: solved.length,
        skipped: skipped.length,
        totalSeconds: phase.totalMs / 1000,
        at: Date.now(),
      })
      setPhase({
        kind: "done",
        totalMs: phase.totalMs,
        solved,
        skipped,
      })
      return
    }
    setPhase({
      ...phase,
      cursor: next,
      solved,
      skipped,
      flash:
        outcome.kind === "solved"
          ? null
          : { country: outcome.country, until: performance.now() + 600 },
    })
  }

  const onSolve = (c: Country) => {
    if (c.id !== target.id) {
      // wrong country typed — ignore (no penalty)
      return
    }
    advanceCursor({ kind: "solved", country: c })
  }

  const onSkip = () => {
    advanceCursor({ kind: "skipped", country: target })
  }

  const score = phase.solved.length * 4 - phase.skipped.length

  return (
    <div className="space-y-4">
      <GameHUD
        timerPct={timerPct}
        stats={[
          { label: "Time left", value: formatMMSS(remainingSec) },
          { label: "Score", value: `${score}`, accent: true },
          { label: "Correct", value: `${phase.solved.length}` },
          { label: "Skipped", value: `${phase.skipped.length}` },
        ]}
      />
      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="border bg-card">
          <WorldMap
            targetId={target.id}
            solvedIds={solvedIds}
            wrongId={phase.flash?.country.id ?? null}
            className="h-auto w-full"
          />
        </div>
        <div className="flex flex-col gap-3">
          <div className="border bg-card p-3">
            <div className="mb-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Region
            </div>
            <CountryInset targetId={target.id} className="h-auto w-full" />
          </div>
          <div className="border bg-card p-3">
            <div className="mb-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Your answer
            </div>
            <CountryAutocomplete pool={pool} onSolve={onSolve} />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onSkip}>
              Skip (−1)
            </Button>
          </div>
          {phase.flash && (
            <div className="border border-destructive/50 bg-destructive/[0.05] p-3 text-sm">
              <span className="text-muted-foreground">Skipped · </span>
              <span className="font-medium">{phase.flash.country.name}</span>
            </div>
          )}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Type the highlighted country's name · Enter submits · scroll/drag the map to explore.
      </p>
    </div>
  )
}

function Summary({
  phase,
  onPlayAgain,
}: {
  phase: Extract<Phase, { kind: "done" }>
  onPlayAgain: () => void
}) {
  const score = phase.solved.length * 4 - phase.skipped.length
  const total = phase.solved.length + phase.skipped.length
  return (
    <div className="space-y-6 border bg-card p-6">
      <div className="space-y-1">
        <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          Session complete
        </div>
        <h2 className="font-serif text-5xl font-normal tabular-nums">{score}</h2>
        <p className="text-sm text-muted-foreground">
          {phase.solved.length} correct · {phase.skipped.length} skipped · {total} answered · {Math.round(phase.totalMs / 60_000)} min
        </p>
      </div>
      {phase.skipped.length > 0 && (
        <div>
          <div className="mb-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Missed
          </div>
          <div className="flex flex-wrap gap-1.5">
            {phase.skipped.map((c) => (
              <span
                key={c.id}
                className="border border-destructive/30 px-2 py-0.5 text-xs text-muted-foreground"
              >
                {c.name}
              </span>
            ))}
          </div>
        </div>
      )}
      <div className="flex flex-wrap gap-3">
        <Button size="lg" onClick={onPlayAgain}>
          Play again
        </Button>
        <Link to="/" className="self-center text-sm text-muted-foreground hover:text-foreground">
          Home
        </Link>
      </div>
    </div>
  )
}

function formatMMSS(totalSec: number): string {
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${s.toString().padStart(2, "0")}`
}
