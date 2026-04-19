import { Link, createFileRoute } from "@tanstack/react-router"
import { useEffect, useMemo, useRef, useState } from "react"
import type { Country } from "@/lib/countries"
import type { WorldData } from "@/lib/geo"
import { WorldMap } from "@/components/map/WorldMap"
import { GameHUD } from "@/components/game/GameHUD"
import { RoundFeedback } from "@/components/game/RoundFeedback"
import { SessionConfig } from "@/components/game/SessionConfig"
import { Button } from "@/components/ui/button"
import { randomCountries } from "@/lib/countries"
import { useWorld } from "@/lib/geo"
import { distanceToFeature, scoreForDistanceKm } from "@/lib/scoring"
import { saveLocateBest } from "@/lib/storage"
import { cn } from "@/lib/utils"

export const Route = createFileRoute("/play/locate")({ component: LocatePage })

type Phase =
  | { kind: "setup" }
  | {
      kind: "playing"
      queue: Array<Country>
      index: number
      score: number
      turnStartedAt: number
      perTurnMs: number
      turns: number
      history: Array<RoundResult>
    }
  | {
      kind: "feedback"
      queue: Array<Country>
      index: number
      score: number
      perTurnMs: number
      turns: number
      history: Array<RoundResult>
      last: RoundResult & { click: [number, number] | null }
    }
  | {
      kind: "done"
      score: number
      turns: number
      perTurnMs: number
      history: Array<RoundResult>
    }

type RoundResult = {
  country: Country
  km: number
  inside: boolean
  points: number
  missed: boolean
}

function LocatePage() {
  const { data: world } = useWorld()
  const [phase, setPhase] = useState<Phase>({ kind: "setup" })

  if (phase.kind === "setup") {
    return (
      <Shell>
        <SessionConfig
          title="Locate mode"
          description="We name a country — click on the map where you think it is. Points scale by how close you are to the real border."
          ctaLabel="Start locating"
          groups={[
            {
              key: "turns",
              label: "Turns",
              unit: "turns",
              choices: [
                { label: "5", value: 5 },
                { label: "10", value: 10 },
                { label: "20", value: 20 },
                { label: "50", value: 50 },
              ],
              defaultValue: 10,
              min: 1,
              max: 100,
            },
            {
              key: "perTurn",
              label: "Seconds per turn",
              unit: "s",
              choices: [
                { label: "10s", value: 10 },
                { label: "20s", value: 20 },
                { label: "30s", value: 30 },
                { label: "60s", value: 60 },
              ],
              defaultValue: 20,
              min: 5,
              max: 120,
            },
          ]}
          onStart={({ turns, perTurn }) => {
            const queue = randomCountries(turns)
            setPhase({
              kind: "playing",
              queue,
              index: 0,
              score: 0,
              turnStartedAt: performance.now(),
              perTurnMs: perTurn * 1000,
              turns,
              history: [],
            })
          }}
        />
      </Shell>
    )
  }

  if (phase.kind === "done") {
    return (
      <Shell>
        <Summary
          phase={phase}
          onPlayAgain={() => setPhase({ kind: "setup" })}
        />
      </Shell>
    )
  }

  return (
    <Shell>
      <ActiveRound
        phase={phase}
        world={world}
        onComplete={setPhase}
      />
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
            I.
          </span>
          Locate
        </span>
      </nav>
      {children}
    </div>
  )
}

type ActivePhase = Extract<Phase, { kind: "playing" } | { kind: "feedback" }>

function ActiveRound({
  phase,
  world,
  onComplete,
}: {
  phase: ActivePhase
  world: WorldData | null
  onComplete: (p: Phase) => void
}) {
  const [tick, setTick] = useState(0)
  const target = phase.queue[phase.index]

  // Timer tick for the progress bar + auto-advance on expire.
  const expiredRef = useRef(false)
  useEffect(() => {
    if (phase.kind !== "playing") return
    expiredRef.current = false
    const id = setInterval(() => setTick((t) => t + 1), 100)
    return () => clearInterval(id)
  }, [phase.kind, phase.index])

  useEffect(() => {
    if (phase.kind !== "playing") return
    const elapsed = performance.now() - phase.turnStartedAt
    if (elapsed < phase.perTurnMs) return
    if (expiredRef.current) return
    expiredRef.current = true
    // Auto-advance on expire (missed)
    resolveRound(null)
  }, [tick])

  const resolveRound = (lonLat: [number, number] | null) => {
    if (phase.kind !== "playing" || !world) return
    const feature = world.featuresById.get(target.id)
    let km = Infinity
    let inside = false
    let nearest: [number, number] | null = null
    let points = 0
    const missed = lonLat == null
    if (lonLat && feature) {
      const r = distanceToFeature(lonLat, feature)
      km = r.km
      inside = r.inside
      nearest = r.nearest
      points = scoreForDistanceKm(km, inside)
    }
    const result: RoundResult = { country: target, km, inside, points, missed }
    const nextHistory = [...phase.history, result]
    const nextScore = phase.score + points
    onComplete({
      kind: "feedback",
      queue: phase.queue,
      index: phase.index,
      score: nextScore,
      perTurnMs: phase.perTurnMs,
      turns: phase.turns,
      history: nextHistory,
      last: { ...result, click: lonLat, nearest } as RoundResult & {
        click: [number, number] | null
        nearest?: [number, number] | null
      },
    })
  }

  const advance = () => {
    if (phase.kind !== "feedback") return
    const nextIndex = phase.index + 1
    if (nextIndex >= phase.queue.length) {
      const best = saveLocateBest({
        score: phase.score,
        turns: phase.turns,
        perTurn: phase.perTurnMs / 1000,
        at: Date.now(),
      })
      // not used directly, but trigger localStorage write
      void best
      onComplete({
        kind: "done",
        score: phase.score,
        turns: phase.turns,
        perTurnMs: phase.perTurnMs,
        history: phase.history,
      })
      return
    }
    onComplete({
      kind: "playing",
      queue: phase.queue,
      index: nextIndex,
      score: phase.score,
      turnStartedAt: performance.now(),
      perTurnMs: phase.perTurnMs,
      turns: phase.turns,
      history: phase.history,
    })
  }

  const timerPct = useMemo(() => {
    if (phase.kind !== "playing") return 100
    const elapsed = performance.now() - phase.turnStartedAt
    return Math.max(0, 100 - (elapsed / phase.perTurnMs) * 100)
  }, [tick, phase])

  const marker =
    phase.kind === "feedback" && phase.last.click
      ? {
          click: phase.last.click,
          nearest:
            (phase.last as { nearest?: [number, number] | null }).nearest ?? null,
          inside: phase.last.inside,
        }
      : null

  return (
    <div className="space-y-6">
      <GameHUD
        timerPct={phase.kind === "playing" ? timerPct : 0}
        stats={[
          { label: "Find", value: target.name, accent: true, wide: true },
          { label: "Round", value: `${phase.index + 1} / ${phase.turns}` },
          { label: "Score", value: `${phase.score}` },
        ]}
      />
      <div className="border border-border bg-card">
        <WorldMap
          crosshair
          onLocateClick={
            phase.kind === "playing"
              ? (ll) => {
                  expiredRef.current = true
                  resolveRound(ll)
                }
              : undefined
          }
          marker={marker}
          solvedIds={
            phase.kind === "feedback" && phase.last.inside
              ? new Set([phase.last.country.id])
              : undefined
          }
          targetId={
            phase.kind === "feedback" ? phase.last.country.id : undefined
          }
          className="h-auto w-full"
        />
      </div>
      {phase.kind === "feedback" && (
        <div className="flex flex-col gap-3 md:flex-row md:items-stretch">
          <div className="md:flex-1">
            <RoundFeedback
              country={phase.last.country.name}
              km={phase.last.km}
              inside={phase.last.inside}
              points={phase.last.points}
              missed={phase.last.missed}
            />
          </div>
          <Button
            size="lg"
            onClick={advance}
            autoFocus
            className="group/next h-14 w-full justify-between gap-4 px-6 text-sm uppercase tracking-[0.3em] md:h-auto md:w-60"
          >
            <span>
              {phase.index + 1 >= phase.queue.length ? "Summary" : "Next round"}
            </span>
            <span
              aria-hidden
              className="text-base transition-transform group-hover/next:translate-x-1"
            >
              →
            </span>
          </Button>
        </div>
      )}
      {phase.kind === "playing" && (
        <p className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
          <span>Tap to pin</span>
          <span aria-hidden>·</span>
          <span>Drag to pan</span>
          <span aria-hidden>·</span>
          <span>Pinch / scroll to zoom</span>
          <span aria-hidden>·</span>
          <span>Double-tap to reset</span>
        </p>
      )}
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
  const avg = phase.history.length
    ? Math.round(phase.score / phase.history.length)
    : 0
  const perfects = phase.history.filter((h) => h.inside).length
  return (
    <div className="space-y-12 py-4 md:py-8">
      <header className="space-y-6">
        <span className="inline-flex items-center gap-3 text-[10px] uppercase tracking-[0.4em] text-muted-foreground">
          <span className="h-px w-6 bg-border" />
          Session complete
        </span>
        <div className="flex flex-wrap items-end gap-x-8 gap-y-4">
          <h2 className="font-serif text-7xl font-normal leading-none tabular-nums md:text-8xl">
            {phase.score}
          </h2>
          <dl className="grid grid-cols-3 gap-x-8 gap-y-1 text-xs">
            <Stat label="Turns" value={`${phase.turns}`} />
            <Stat label="Per turn" value={`${phase.perTurnMs / 1000}s`} />
            <Stat label="Avg" value={`${avg}`} />
            <Stat label="Bull's-eyes" value={`${perfects}`} />
            <Stat
              label="Score / max"
              value={`${Math.round((phase.score / (phase.turns * 1000)) * 100)}%`}
            />
          </dl>
        </div>
      </header>

      <section className="border-t border-border pt-8">
        <div className="mb-6 flex items-baseline justify-between">
          <span className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            Round by round
          </span>
          <span className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground/60 tabular-nums">
            {phase.history.length} round{phase.history.length === 1 ? "" : "s"}
          </span>
        </div>
        <ol className="divide-y divide-border/60">
          {phase.history.map((h, i) => (
            <li
              key={i}
              className="grid grid-cols-[auto_1fr_auto_auto] items-baseline gap-5 py-4"
            >
              <span className="font-serif text-lg italic tabular-nums text-muted-foreground/60">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="truncate text-sm">{h.country.name}</span>
              <span className="text-[11px] uppercase tracking-[0.2em] tabular-nums text-muted-foreground">
                {h.missed
                  ? "time up"
                  : h.inside
                    ? "inside"
                    : `${Math.round(h.km).toLocaleString()} km`}
              </span>
              <span
                className={cn(
                  "font-serif text-xl tabular-nums",
                  h.points > 0 ? "text-foreground" : "text-muted-foreground/60"
                )}
              >
                +{h.points}
              </span>
            </li>
          ))}
        </ol>
      </section>

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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <dt className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </dt>
      <dd className="font-serif text-lg font-normal tabular-nums">{value}</dd>
    </div>
  )
}

