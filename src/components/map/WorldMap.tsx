import { useEffect, useMemo, useRef, useState } from "react"
import { CountryPath } from "./CountryPath"
import { Graticule } from "./Graticule"
import { ResultMarker } from "./ResultMarker"
import { useZoomPan } from "./useZoomPan"
import { makeProjection, pathGenerator, useWorld } from "@/lib/geo"
import { cn } from "@/lib/utils"

const VB_W = 960
const VB_H = 520

type Props = {
  /** Mode A: called with the clicked [lon, lat]. */
  onLocateClick?: (lonLat: [number, number]) => void
  /** Mode B: country id to highlight in `target` variant. */
  targetId?: string | null
  /** Countries already solved — filled with `correct`. */
  solvedIds?: ReadonlySet<string>
  /** Country revealed after skip — filled with `wrong`. */
  wrongId?: string | null
  /** Mode A overlay markers. */
  marker?: {
    click: [number, number]
    nearest: [number, number] | null
    inside: boolean
  } | null
  /** Hide the graticule (used by CountryInset for a cleaner look). */
  hideGraticule?: boolean
  className?: string
  /** When true, country hover feedback is suppressed (Mode A gets a crosshair). */
  crosshair?: boolean
}

export function WorldMap({
  onLocateClick,
  targetId,
  solvedIds,
  wrongId,
  marker,
  hideGraticule,
  className,
  crosshair,
}: Props) {
  const world = useWorld()
  const [hoverId, setHoverId] = useState<string | null>(null)
  const downRef = useRef<{ x: number; y: number } | null>(null)

  const projection = useMemo(() => {
    if (!world) return null
    return makeProjection(VB_W, VB_H, {
      type: "FeatureCollection",
      features: world.features,
    })
  }, [world])

  const path = useMemo(() => (projection ? pathGenerator(projection) : null), [projection])

  /** Precompute path strings once. */
  const paths = useMemo(() => {
    if (!path || !world) return []
    return world.features.map((f) => ({
      id: f.id == null ? "" : String(f.id),
      d: path(f) ?? "",
    }))
  }, [path, world])

  /** Ring marker around the target country so it's easy to spot on the world. */
  const targetRing = useMemo(() => {
    if (!targetId || !path || !world || onLocateClick) return null
    const target = world.featuresById.get(targetId)
    if (!target) return null
    const [[bx0, by0], [bx1, by1]] = path.bounds(target)
    if (!Number.isFinite(bx0) || !Number.isFinite(bx1)) return null
    const cx = (bx0 + bx1) / 2
    const cy = (by0 + by1) / 2
    const footprint = Math.max(bx1 - bx0, by1 - by0)
    const r = Math.max(footprint / 2 + 10, 14)
    return { cx, cy, r }
  }, [targetId, path, world, onLocateClick])

  const { transform, svgHandlers } = useZoomPan({ minScale: 1, maxScale: 24 })

  const onSvgPointerDown: React.PointerEventHandler<SVGSVGElement> = (e) => {
    downRef.current = { x: e.clientX, y: e.clientY }
    svgHandlers.onPointerDown(e)
  }
  const onSvgPointerUp: React.PointerEventHandler<SVGSVGElement> = (e) => {
    const wasDragged = svgHandlers.onPointerUp(e)
    const down = downRef.current
    downRef.current = null
    if (wasDragged) return
    if (!onLocateClick || !projection) return
    if (!down) return
    // Convert client → SVG viewBox coords → apply inverse zoom transform → invert projection
    const svg = e.currentTarget
    const r = svg.getBoundingClientRect()
    const vx = ((e.clientX - r.left) / r.width) * VB_W
    const vy = ((e.clientY - r.top) / r.height) * VB_H
    const gx = (vx - transform.tx) / transform.k
    const gy = (vy - transform.ty) / transform.k
    const lonLat = projection.invert?.([gx, gy])
    if (lonLat) onLocateClick([lonLat[0], lonLat[1]] as [number, number])
  }

  // Clear hover on pointerleave (in case pointerleave on a path is missed)
  useEffect(() => {
    if (!world) return
    const onUp = () => setHoverId((h) => h)
    window.addEventListener("pointerup", onUp)
    return () => window.removeEventListener("pointerup", onUp)
  }, [world])

  const variantFor = (id: string) => {
    if (wrongId && id === wrongId) return "wrong" as const
    if (solvedIds && solvedIds.has(id)) return "correct" as const
    if (targetId && id === targetId) return "target" as const
    if (!onLocateClick && hoverId === id) return "hover" as const
    return "idle" as const
  }

  return (
    <svg
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      xmlns="http://www.w3.org/2000/svg"
      className={cn(
        "touch-none select-none",
        crosshair ? "cursor-crosshair" : "cursor-grab active:cursor-grabbing",
        className
      )}
      {...svgHandlers}
      onPointerDown={onSvgPointerDown}
      onPointerUp={onSvgPointerUp}
    >
      <rect x={0} y={0} width={VB_W} height={VB_H} fill="var(--color-map-ocean)" />

      <g transform={`translate(${transform.tx} ${transform.ty}) scale(${transform.k})`}>
        {path && !hideGraticule && <Graticule path={path} />}
        {paths.map(({ id, d }) => (
          <CountryPath
            key={id || d.slice(0, 12)}
            d={d}
            variant={variantFor(id)}
            interactive={!onLocateClick}
            onHover={
              !onLocateClick && id
                ? (h) => setHoverId(h ? id : (curr) => (curr === id ? null : curr))
                : undefined
            }
          />
        ))}
        {marker && projection && (
          <ResultMarker
            projection={projection}
            click={marker.click}
            nearest={marker.nearest}
            inside={marker.inside}
          />
        )}
        {targetRing && (
          <g pointerEvents="none">
            <circle
              cx={targetRing.cx}
              cy={targetRing.cy}
              r={targetRing.r + 6}
              fill="none"
              stroke="var(--color-map-target)"
              strokeOpacity={0.35}
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
            <circle
              cx={targetRing.cx}
              cy={targetRing.cy}
              r={targetRing.r}
              fill="none"
              stroke="var(--color-map-target)"
              strokeWidth={1.75}
              vectorEffect="non-scaling-stroke"
            />
          </g>
        )}
      </g>
    </svg>
  )
}
