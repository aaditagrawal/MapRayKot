import { classNames } from "@/ui.stylex"
import { Link, createFileRoute } from "@tanstack/react-router"
import { useCallback, useEffect, useRef, useState } from "react"
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
      last: RoundOutcome
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

/** A resolved round plus where the player clicked and the closest border point. */
type RoundOutcome = RoundResult & {
  click: [number, number] | null
  nearest: [number, number] | null
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
      <ActiveRound phase={phase} world={world} onComplete={setPhase} />
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className={classNames.routesPlayLocate190}>
      <nav className={classNames.routesPlayLocate191}>
        <Link to="/" className={classNames.routesPlayLocate192}>
          <span aria-hidden className={classNames.routesPlayLocate193}>
            ←
          </span>
          <span>Atlas</span>
        </Link>
        <span className={classNames.routesPlayLocate194}>
          <span className={classNames.routesPlayLocate195}>I.</span>
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
  const turnStartedAt = phase.kind === "playing" ? phase.turnStartedAt : null
  const perTurnMs = phase.kind === "playing" ? phase.perTurnMs : null

  const resolveRound = useCallback(
    (lonLat: [number, number] | null) => {
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
      const result: RoundResult = {
        country: target,
        km,
        inside,
        points,
        missed,
      }
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
        last: { ...result, click: lonLat, nearest },
      })
    },
    [onComplete, phase, target, world]
  )

  // Timer tick for the progress bar + auto-advance on expire.
  const expiredRef = useRef(false)
  useEffect(() => {
    if (phase.kind !== "playing") return
    expiredRef.current = false
    const id = setInterval(() => setTick((t) => t + 1), 100)
    return () => clearInterval(id)
  }, [phase.kind, phase.index])

  useEffect(() => {
    if (phase.kind !== "playing" || turnStartedAt == null || perTurnMs == null)
      return
    const elapsed = performance.now() - turnStartedAt
    if (elapsed < perTurnMs) return
    if (expiredRef.current) return
    expiredRef.current = true
    // Auto-advance on expire (missed)
    resolveRound(null)
  }, [tick, phase.kind, turnStartedAt, perTurnMs, resolveRound])

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

  let timerPct = 100
  if (phase.kind === "playing") {
    void tick
    const elapsed = performance.now() - phase.turnStartedAt
    timerPct = Math.max(0, 100 - (elapsed / phase.perTurnMs) * 100)
  }

  const marker =
    phase.kind === "feedback" && phase.last.click
      ? {
          click: phase.last.click,
          nearest: phase.last.nearest,
          inside: phase.last.inside,
        }
      : null

  return (
    <div className={classNames.routesPlayLocate196}>
      <GameHUD
        timerPct={phase.kind === "playing" ? timerPct : 0}
        stats={[
          { label: "Find", value: target.name, accent: true, wide: true },
          { label: "Round", value: `${phase.index + 1} / ${phase.turns}` },
          { label: "Score", value: `${phase.score}` },
        ]}
      />
      <div className={classNames.routesPlayLocate197}>
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
          className={classNames.routesPlayLocate198}
        />
      </div>
      {phase.kind === "feedback" && (
        <div className={classNames.routesPlayLocate199}>
          <div className={classNames.routesPlayLocate200}>
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
            className={classNames.routesPlayLocate201}
          >
            <span>
              {phase.index + 1 >= phase.queue.length ? "Summary" : "Next round"}
            </span>
            <span aria-hidden className={classNames.routesPlayLocate202}>
              →
            </span>
          </Button>
        </div>
      )}
      {phase.kind === "playing" && (
        <p className={classNames.routesPlayLocate203}>
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
    <div className={classNames.componentsGameSessionConfig27}>
      <header className={classNames.routesPlayLocate196}>
        <span className={classNames.componentsGameSessionConfig29}>
          <span className={classNames.componentsGameSessionConfig30} />
          Session complete
        </span>
        <div className={classNames.routesPlayLocate204}>
          <h2 className={classNames.routesPlayLocate205}>{phase.score}</h2>
          <dl className={classNames.routesPlayLocate206}>
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

      <section className={classNames.componentsGameSessionConfig46}>
        <div className={classNames.routesPlayLocate207}>
          <span className={classNames.componentsGameGameHUD10}>
            Round by round
          </span>
          <span className={classNames.routesIndex178}>
            {phase.history.length} round{phase.history.length === 1 ? "" : "s"}
          </span>
        </div>
        <ol className={classNames.routesPlayLocate208}>
          {phase.history.map((h, i) => (
            <li key={i} className={classNames.routesPlayLocate209}>
              <span className={classNames.routesPlayLocate210}>
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className={classNames.routesPlayLocate211}>
                {h.country.name}
              </span>
              <span className={classNames.routesPlayLocate212}>
                {h.missed
                  ? "time up"
                  : h.inside
                    ? "inside"
                    : `${Math.round(h.km).toLocaleString()} km`}
              </span>
              <span
                className={cn(
                  classNames.routesPlayLocate213,
                  h.points > 0
                    ? classNames.routesPlayLocate214
                    : classNames.routesPlayLocate215
                )}
              >
                +{h.points}
              </span>
            </li>
          ))}
        </ol>
      </section>

      <div className={classNames.routesPlayLocate216}>
        <Button
          size="lg"
          onClick={onPlayAgain}
          className={classNames.routesPlayLocate217}
        >
          Play again
          <span aria-hidden className={classNames.routesPlayLocate218}>
            →
          </span>
        </Button>
        <Link to="/" className={classNames.routesPlayLocate192}>
          <span aria-hidden className={classNames.routesPlayLocate193}>
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
    <div className={classNames.routesPlayLocate219}>
      <dt className={classNames.routesPlayLocate220}>{label}</dt>
      <dd className={classNames.routesPlayLocate221}>{value}</dd>
    </div>
  )
}
