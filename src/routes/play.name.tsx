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
    <div className="mx-auto max-w-6xl px-6 py-8 md:py-12">
      <nav className="mb-8 flex items-center justify-between md:mb-12">
        <Link
          to="/"
          className="group inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-muted-foreground transition-colors hover:text-foreground"
        >
          <span aria-hidden className="transition-transform group-hover:-translate-x-0.5">
            ←
          </span>
          <span>Atlas</span>
        </Link>
        <span className="inline-flex items-baseline gap-3 text-[10px] uppercase tracking-[0.4em] text-muted-foreground">
          <span className="font-serif text-base italic normal-case tracking-normal text-muted-foreground/70">
            II.
          </span>
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
    <div className="space-y-6">
      <GameHUD
        timerPct={timerPct}
        stats={[
          { label: "Time left", value: formatMMSS(remainingSec) },
          { label: "Score", value: `${score}`, accent: true },
          { label: "Correct", value: `${phase.solved.length}` },
          { label: "Skipped", value: `${phase.skipped.length}` },
        ]}
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="border border-border bg-card">
          <WorldMap
            targetId={target.id}
            solvedIds={solvedIds}
            wrongId={phase.flash?.country.id ?? null}
            className="h-auto w-full"
          />
        </div>
        <div className="flex flex-col gap-5">
          <section className="border border-border bg-card">
            <div className="flex items-baseline justify-between border-b border-border/60 px-4 py-3">
              <span className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                Region
              </span>
              <span className="font-serif text-sm italic text-muted-foreground/70">
                close-up
              </span>
            </div>
            <div className="p-3">
              <CountryInset targetId={target.id} className="h-auto w-full" />
            </div>
          </section>

          <section className="border border-border bg-card">
            <div className="flex items-baseline justify-between border-b border-border/60 px-4 py-3">
              <span className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                Your answer
              </span>
              <span className="font-serif text-sm italic text-muted-foreground/70">
                +4 / −1
              </span>
            </div>
            <div className="p-3">
              <CountryAutocomplete pool={pool} onSolve={onSolve} />
            </div>
          </section>

          <Button
            variant="outline"
            onClick={onSkip}
            className="group/skip h-10 justify-between text-xs uppercase tracking-[0.3em]"
          >
            <span>Skip</span>
            <span className="font-serif text-base italic text-muted-foreground/70 normal-case tracking-normal">
              −1
            </span>
          </Button>

          {phase.flash && (
            <div className="border border-destructive/50 bg-destructive/[0.05] px-4 py-3">
              <div className="text-[10px] uppercase tracking-[0.3em] text-destructive/80">
                Skipped
              </div>
              <div className="mt-1 font-serif text-xl italic">
                {phase.flash.country.name}
              </div>
            </div>
          )}
        </div>
      </div>

      <p className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
        <span>Type the highlighted country</span>
        <span aria-hidden>·</span>
        <span>Enter submits</span>
        <span aria-hidden>·</span>
        <span>Pinch / scroll to zoom</span>
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
  const accuracy = total > 0 ? Math.round((phase.solved.length / total) * 100) : 0
  return (
    <div className="space-y-12 py-4 md:py-8">
      <header className="space-y-6">
        <span className="inline-flex items-center gap-3 text-[10px] uppercase tracking-[0.4em] text-muted-foreground">
          <span className="h-px w-6 bg-border" />
          Session complete
        </span>
        <div className="flex flex-wrap items-end gap-x-8 gap-y-4">
          <h2 className="font-serif text-7xl font-normal leading-none tabular-nums md:text-8xl">
            {score}
          </h2>
          <dl className="grid grid-cols-2 gap-x-8 gap-y-1 text-xs sm:grid-cols-4">
            <NameStat label="Correct" value={`${phase.solved.length}`} />
            <NameStat label="Skipped" value={`${phase.skipped.length}`} />
            <NameStat label="Accuracy" value={`${accuracy}%`} />
            <NameStat
              label="Length"
              value={`${Math.round(phase.totalMs / 60_000)} min`}
            />
          </dl>
        </div>
      </header>

      {phase.skipped.length > 0 && (
        <section className="border-t border-border pt-8">
          <div className="mb-5 flex items-baseline justify-between">
            <span className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              Missed
            </span>
            <span className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground/60 tabular-nums">
              {phase.skipped.length}
            </span>
          </div>
          <ul className="flex flex-wrap gap-2">
            {phase.skipped.map((c) => (
              <li
                key={c.id}
                className="border border-destructive/30 px-3 py-1 font-serif text-sm italic text-muted-foreground"
              >
                {c.name}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="flex flex-wrap items-center gap-6 border-t border-border pt-8">
        <Button
          size="lg"
          onClick={onPlayAgain}
          className="group/again gap-2 px-6 text-xs uppercase tracking-[0.3em]"
        >
          Play again
          <span aria-hidden className="transition-transform group-hover/again:translate-x-1">
            →
          </span>
        </Button>
        <Link
          to="/"
          className="group inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-muted-foreground transition-colors hover:text-foreground"
        >
          <span aria-hidden className="transition-transform group-hover:-translate-x-0.5">
            ←
          </span>
          Atlas
        </Link>
      </div>
    </div>
  )
}

function NameStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <dt className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </dt>
      <dd className="font-serif text-lg font-normal tabular-nums">{value}</dd>
    </div>
  )
}

function formatMMSS(totalSec: number): string {
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${s.toString().padStart(2, "0")}`
}
