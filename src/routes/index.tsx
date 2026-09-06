import { classNames } from "@/ui.stylex"
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
    <main className={classNames.componentsGameCountryAutocomplete0}>
      <Hero />
      <Modes />
      <History locate={locate} name={name} />
      <Colophon />
    </main>
  )
}

function Hero() {
  return (
    <section className={classNames.routesIndex144}>
      <div className={classNames.routesIndex145}>
        <AtlasSilhouette className={classNames.routesIndex146} />
      </div>
      <div
        className={classNames.routesIndex147}
        style={{
          background:
            "radial-gradient(ellipse 70% 55% at center, transparent 20%, var(--background) 88%)",
        }}
      />

      <div className={classNames.routesIndex148}>
        <span className={classNames.routesIndex149}>
          <span className={classNames.routesIndex150} />
          MapRayKot · An Atlas Game
          <span className={classNames.routesIndex150} />
        </span>

        <h1 className={classNames.routesIndex151}>
          Know the world,
          <br />
          <em className={classNames.componentsGameGameHUD12}>
            one country
          </em> at
          a time.
        </h1>

        <p className={classNames.routesIndex152}>
          Pin it on the map, or name it on sight. Two quiet ways to learn the
          borders you've forgotten.
        </p>

        <div className={classNames.routesIndex153}>
          <Link to="/play/locate" className={classNames.routesIndex154}>
            <span className={classNames.routesIndex155}>Locate</span>
            <span aria-hidden className={classNames.routesIndex156}>
              →
            </span>
          </Link>
          <span aria-hidden className={classNames.routesIndex157} />
          <Link to="/play/name" className={classNames.routesIndex154}>
            <span className={classNames.routesIndex155}>Name</span>
            <span aria-hidden className={classNames.routesIndex156}>
              →
            </span>
          </Link>
        </div>
      </div>

      <div className={classNames.routesIndex158}>scroll for your runs</div>
    </section>
  )
}

function Modes() {
  return (
    <section className={classNames.routesIndex159}>
      <div className={classNames.routesIndex160}>
        <span className={classNames.routesIndex161}>Two modes</span>
        <h2 className={classNames.routesIndex162}>
          {"Choose how you "}
          <em className={classNames.componentsGameGameHUD12}>wander</em>.
        </h2>
      </div>
      <div className={classNames.routesIndex163}>
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
        classNames.routesIndex164,
        align === "end" ? classNames.routesIndex165 : classNames.routesIndex166,
        divider && classNames.routesIndex167
      )}
    >
      <div
        className={cn(
          classNames.routesIndex168,
          align === "end" && classNames.routesIndex169
        )}
      >
        <span className={classNames.routesIndex170}>{numeral}</span>
        <h3 className={classNames.routesIndex171}>{title}</h3>
      </div>
      <p className={classNames.routesIndex172}>{body}</p>
      <span className={classNames.routesIndex173}>
        Begin
        <span aria-hidden className={classNames.routesIndex156}>
          →
        </span>
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
    <section className={classNames.routesIndex174}>
      <div className={classNames.routesIndex160}>
        <span className={classNames.routesIndex161}>Your runs</span>
        <h2 className={classNames.routesIndex162}>
          A <em className={classNames.componentsGameGameHUD12}>quiet</em>
          {" ladder."}
        </h2>
      </div>
      <div className={classNames.routesIndex175}>
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
        classNames.routesIndex176,
        divider && classNames.routesIndex167
      )}
    >
      <div className={classNames.routesIndex177}>
        <span className={classNames.componentsGameGameHUD10}>{label}</span>
        {rows.length > 0 && (
          <span className={classNames.routesIndex178}>
            {rows.length} run{rows.length === 1 ? "" : "s"}
          </span>
        )}
      </div>
      {rows.length === 0 ? (
        <p className={classNames.routesIndex179}>{empty}</p>
      ) : (
        <ol className={classNames.routesIndex180}>
          {rows.map((row, i) => (
            <li key={row.at} className={classNames.routesIndex181}>
              <span
                className={cn(
                  classNames.routesIndex182,
                  i === 0
                    ? classNames.routesIndex183
                    : classNames.routesIndex184
                )}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className={classNames.routesIndex185}>
                <div className={classNames.componentsGameRoundFeedback24}>
                  {row.score}
                </div>
                <div className={classNames.routesIndex186}>{row.meta}</div>
              </div>
              <span className={classNames.routesIndex187}>
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
    <footer className={classNames.routesIndex188}>
      <span className={classNames.routesIndex189}>
        <span className={classNames.componentsGameSessionConfig30} />
        End of the atlas
        <span className={classNames.componentsGameSessionConfig30} />
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
