import { Link, createFileRoute } from "@tanstack/react-router"
import { useEffect, useState } from "react"
import type { LocateRun, NameRun } from "@/lib/storage"
import { AtlasSilhouette } from "@/components/map/AtlasSilhouette"
import { historyLocate, historyName } from "@/lib/storage"
import { cn } from "@/lib/utils"

export const Route = createFileRoute("/")({ component: Home })

function Home() {
  const [locate, setLocate] = useState<Array<LocateRun>>([])
  const [name, setName] = useState<Array<NameRun>>([])

  useEffect(() => {
    setLocate(historyLocate())
    setName(historyName())
  }, [])

  return (
    <main className="relative">
      <Hero />
      <Modes />
      <History locate={locate} name={name} />
      <Colophon />
    </main>
  )
}

function Hero() {
  return (
    <section className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden px-6 py-24">
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <AtlasSilhouette className="w-[180%] max-w-none text-primary/[0.07] dark:text-primary/[0.10] sm:w-[140%] md:w-[120%] lg:w-[105%]" />
      </div>
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 55% at center, transparent 20%, var(--background) 88%)",
        }}
      />

      <div className="relative z-10 flex max-w-3xl flex-col items-center text-center">
        <span className="mb-10 inline-flex items-center gap-3 text-[10px] uppercase tracking-[0.4em] text-muted-foreground animate-in fade-in duration-300 fill-mode-both">
          <span className="h-px w-8 bg-border" />
          MapRayKot · An Atlas Game
          <span className="h-px w-8 bg-border" />
        </span>

        <h1 className="font-serif text-5xl font-normal leading-[1.02] tracking-tight animate-in fade-in slide-in-from-bottom-1 duration-500 delay-75 fill-mode-both sm:text-6xl md:text-7xl lg:text-[5.5rem]">
          Know the world,
          <br />
          <em className="italic text-primary">one country</em> at a time.
        </h1>

        <p className="mt-8 max-w-md text-balance text-sm leading-relaxed text-muted-foreground animate-in fade-in duration-500 delay-200 fill-mode-both md:text-base">
          Pin it on the map, or name it on sight. Two quiet ways to learn the
          borders you've forgotten.
        </p>

        <div className="mt-12 flex items-center gap-7 text-xs uppercase tracking-[0.3em] animate-in fade-in slide-in-from-bottom-1 duration-500 delay-300 fill-mode-both">
          <Link
            to="/play/locate"
            className="group inline-flex items-center gap-2 text-foreground transition-colors hover:text-primary"
          >
            <span className="border-b border-foreground/40 pb-1 transition-colors group-hover:border-primary">
              Locate
            </span>
            <span aria-hidden className="transition-transform group-hover:translate-x-1">→</span>
          </Link>
          <span aria-hidden className="h-3 w-px bg-border" />
          <Link
            to="/play/name"
            className="group inline-flex items-center gap-2 text-foreground transition-colors hover:text-primary"
          >
            <span className="border-b border-foreground/40 pb-1 transition-colors group-hover:border-primary">
              Name
            </span>
            <span aria-hidden className="transition-transform group-hover:translate-x-1">→</span>
          </Link>
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-[0.4em] text-muted-foreground/60 animate-in fade-in duration-500 delay-500 fill-mode-both">
        scroll for your runs
      </div>
    </section>
  )
}

function Modes() {
  return (
    <section className="border-t border-border">
      <div className="mx-auto max-w-5xl px-6 py-20 text-center md:py-28">
        <span className="text-[10px] uppercase tracking-[0.4em] text-muted-foreground">
          Two modes
        </span>
        <h2 className="mt-4 font-serif text-4xl font-normal leading-tight tracking-tight md:text-5xl">
          Choose how you <em className="italic text-primary">wander</em>.
        </h2>
      </div>
      <div className="grid border-y border-border md:grid-cols-2">
        <ModeBlock
          to="/play/locate"
          numeral="I."
          title="Locate"
          body="We name a country. You place it on the map. The closer your pin lands to the real border, the higher the score."
          align="end"
        />
        <ModeBlock
          to="/play/name"
          numeral="II."
          title="Name"
          body="A country lights up with a close-up inset. Type its name. Four points for a hit, minus one for a skip."
          align="start"
          divider
        />
      </div>
    </section>
  )
}

function ModeBlock({
  to,
  numeral,
  title,
  body,
  align,
  divider,
}: {
  to: string
  numeral: string
  title: string
  body: string
  align: "start" | "end"
  divider?: boolean
}) {
  return (
    <Link
      to={to}
      className={cn(
        "group relative flex flex-col gap-10 px-6 py-16 transition-colors hover:bg-muted/40 md:gap-14 md:px-12 md:py-20",
        align === "end" ? "md:items-end md:text-right" : "md:items-start md:text-left",
        divider && "border-t border-border md:border-t-0 md:border-l"
      )}
    >
      <div className={cn("flex items-baseline gap-4", align === "end" && "md:flex-row-reverse")}>
        <span className="font-serif text-2xl italic text-muted-foreground/60">
          {numeral}
        </span>
        <h3 className="font-serif text-5xl font-normal leading-none tracking-tight transition-colors group-hover:text-primary md:text-6xl">
          {title}
        </h3>
      </div>
      <p className="max-w-sm text-sm leading-relaxed text-muted-foreground md:text-base">
        {body}
      </p>
      <span className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-muted-foreground transition-colors group-hover:text-primary">
        Begin
        <span aria-hidden className="transition-transform group-hover:translate-x-1">→</span>
      </span>
    </Link>
  )
}

function History({
  locate,
  name,
}: {
  locate: Array<LocateRun>
  name: Array<NameRun>
}) {
  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-5xl px-6 py-20 text-center md:py-28">
        <span className="text-[10px] uppercase tracking-[0.4em] text-muted-foreground">
          Your runs
        </span>
        <h2 className="mt-4 font-serif text-4xl font-normal leading-tight tracking-tight md:text-5xl">
          A <em className="italic text-primary">quiet</em> ladder.
        </h2>
      </div>
      <div className="mx-auto grid max-w-5xl border-t border-border md:grid-cols-2">
        <Ladder
          label="Locate"
          empty="Pin a country to start your ladder."
          rows={locate.slice(0, 5).map((r) => ({
            at: r.at,
            score: r.score,
            meta: `${r.turns} turns · ${r.perTurn}s each`,
          }))}
        />
        <Ladder
          label="Name"
          empty="Type a country to start your ladder."
          rows={name.slice(0, 5).map((r) => ({
            at: r.at,
            score: r.score,
            meta: `${r.correct} right · ${r.skipped} skipped · ${Math.round(r.totalSeconds / 60)} min`,
          }))}
          divider
        />
      </div>
    </section>
  )
}

type LadderRow = { at: number; score: number; meta: string }

function Ladder({
  label,
  empty,
  rows,
  divider,
}: {
  label: string
  empty: string
  rows: Array<LadderRow>
  divider?: boolean
}) {
  return (
    <div
      className={cn(
        "px-6 py-12 md:px-12 md:py-16",
        divider && "border-t border-border md:border-t-0 md:border-l"
      )}
    >
      <div className="mb-8 flex items-baseline justify-between">
        <span className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
          {label}
        </span>
        {rows.length > 0 && (
          <span className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground/60 tabular-nums">
            {rows.length} run{rows.length === 1 ? "" : "s"}
          </span>
        )}
      </div>
      {rows.length === 0 ? (
        <p className="font-serif text-lg italic text-muted-foreground">{empty}</p>
      ) : (
        <ol className="space-y-0">
          {rows.map((row, i) => (
            <li
              key={row.at}
              className="grid grid-cols-[auto_1fr_auto] items-baseline gap-5 border-t border-border/60 py-4 first:border-t-0"
            >
              <span
                className={cn(
                  "font-serif tabular-nums",
                  i === 0
                    ? "text-2xl text-primary"
                    : "text-lg text-muted-foreground/60"
                )}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="min-w-0">
                <div className="font-serif text-3xl font-normal leading-none tabular-nums md:text-4xl">
                  {row.score}
                </div>
                <div className="mt-2 truncate text-[11px] text-muted-foreground">
                  {row.meta}
                </div>
              </div>
              <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70 tabular-nums">
                {timeAgo(row.at)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

function Colophon() {
  return (
    <footer className="px-6 py-10 text-center text-[10px] uppercase tracking-[0.4em] text-muted-foreground/70">
      <span className="inline-flex items-center gap-3">
        <span className="h-px w-6 bg-border" />
        End of the atlas
        <span className="h-px w-6 bg-border" />
      </span>
    </footer>
  )
}

function timeAgo(ts: number): string {
  const s = Math.max(0, (Date.now() - ts) / 1000)
  if (s < 60) return "just now"
  const m = Math.round(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.round(h / 24)
  if (d < 7) return `${d}d ago`
  const w = Math.round(d / 7)
  if (w < 5) return `${w}w ago`
  const mo = Math.round(d / 30)
  return `${mo}mo ago`
}
