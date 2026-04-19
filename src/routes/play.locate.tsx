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
  const world = useWorld()
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
    <div className="mx-auto max-w-6xl px-6 py-8">
      <nav className="mb-6 flex items-center gap-3 text-sm">
        <Link to="/" className="text-muted-foreground hover:text-foreground">
          ← Back
        </Link>
        <span className="text-muted-foreground">·</span>
        <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
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
    <div className="space-y-4">
      <GameHUD
        timerPct={phase.kind === "playing" ? timerPct : 0}
        stats={[
          { label: "Find", value: target.name, accent: true },
          { label: "Round", value: `${phase.index + 1} / ${phase.turns}` },
          { label: "Score", value: `${phase.score}` },
        ]}
      />
      <div className="border bg-card">
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
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="md:flex-1">
            <RoundFeedback
              country={phase.last.country.name}
              km={phase.last.km}
              inside={phase.last.inside}
              points={phase.last.points}
              missed={phase.last.missed}
            />
          </div>
          <Button size="lg" onClick={advance} className="md:self-stretch">
            {phase.index + 1 >= phase.queue.length ? "See summary" : "Next →"}
          </Button>
        </div>
      )}
      {phase.kind === "playing" && (
        <p className="text-xs text-muted-foreground">
          Scroll to zoom · drag to pan · double-click to reset · click to place your pin.
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
    <div className="space-y-6 border bg-card p-6">
      <div className="space-y-1">
        <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          Session complete
        </div>
        <h2 className="font-serif text-5xl font-normal tabular-nums">{phase.score}</h2>
        <p className="text-sm text-muted-foreground">
          {phase.turns} turns · {phase.perTurnMs / 1000}s each · avg{" "}
          <span className="tabular-nums">{avg}</span> / turn · {perfects} bull's-eye
          {perfects === 1 ? "" : "s"}
        </p>
      </div>
      <div className="border">
        <div className="grid grid-cols-[1fr_auto_auto] divide-y divide-border">
          {phase.history.map((h, i) => (
            <div key={i} className="contents">
              <div className="px-3 py-2 text-sm">{h.country.name}</div>
              <div className="px-3 py-2 text-right text-xs text-muted-foreground tabular-nums">
                {h.missed
                  ? "time up"
                  : h.inside
                    ? "inside"
                    : `${Math.round(h.km).toLocaleString()} km`}
              </div>
              <div className="px-3 py-2 text-right text-sm font-medium tabular-nums">
                +{h.points}
              </div>
            </div>
          ))}
        </div>
      </div>
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

