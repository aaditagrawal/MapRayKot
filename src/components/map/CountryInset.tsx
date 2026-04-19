import { useMemo } from "react"
import { geoBounds, geoEqualEarth, geoPath } from "d3-geo"
import { CountryPath } from "./CountryPath"
import type { Feature, MultiPoint, MultiPolygon, Polygon } from "geojson"
import { useWorld } from "@/lib/geo"
import { cn } from "@/lib/utils"

const VB_W = 360
const VB_H = 240
const PAD_PX = 8
/** Minimum span (degrees) the regional view will show, so tiny countries still
 * render with visible neighbors. Larger countries naturally get more context. */
const MIN_LON_SPAN = 22
const MIN_LAT_SPAN = 16
/** How far to extend past the country's own bbox (on each side), as a multiple
 * of the country's own span. Enough to see adjacent countries. */
const EXPAND_FACTOR = 1.0

type Props = {
  targetId: string
  className?: string
}

function expandBounds(
  bounds: [[number, number], [number, number]]
): [[number, number], [number, number]] {
  const [[x0, y0], [x1, y1]] = bounds
  const lonSpan = x1 - x0
  const latSpan = y1 - y0
  const targetLonSpan = Math.max(lonSpan * (1 + EXPAND_FACTOR * 2), MIN_LON_SPAN)
  const targetLatSpan = Math.max(latSpan * (1 + EXPAND_FACTOR * 2), MIN_LAT_SPAN)
  const padLon = (targetLonSpan - lonSpan) / 2
  const padLat = (targetLatSpan - latSpan) / 2
  const ex0 = Math.max(-180, x0 - padLon)
  const ex1 = Math.min(180, x1 + padLon)
  const ey0 = Math.max(-85, y0 - padLat)
  const ey1 = Math.min(85, y1 + padLat)
  return [
    [ex0, ey0],
    [ex1, ey1],
  ]
}

export function CountryInset({ targetId, className }: Props) {
  const { data: world, error } = useWorld()

  const paths = useMemo(() => {
    if (!world) return []
    const target = world.featuresById.get(targetId) as
      | Feature<Polygon | MultiPolygon>
      | undefined
    if (!target) return []

    const [[x0, y0], [x1, y1]] = expandBounds(geoBounds(target))
    // MultiPoint corners avoid the spherical-winding issue that a rectangular
    // Polygon would trigger here (CCW ring → interior-is-the-whole-world).
    const fitObj: MultiPoint = {
      type: "MultiPoint",
      coordinates: [
        [x0, y0],
        [x1, y0],
        [x1, y1],
        [x0, y1],
      ],
    }

    const projection = geoEqualEarth().fitExtent(
      [
        [PAD_PX, PAD_PX],
        [VB_W - PAD_PX, VB_H - PAD_PX],
      ],
      fitObj
    )
    const path = geoPath(projection)
    return world.features.map((f) => ({
      id: f.id == null ? "" : String(f.id),
      d: path(f) ?? "",
    }))
  }, [world, targetId])

  if (error) {
    return (
      <div
        className={cn(
          "flex aspect-[3/2] w-full items-center justify-center bg-[var(--color-map-ocean)] p-2 text-center text-xs text-muted-foreground",
          className
        )}
      >
        Map unavailable
      </div>
    )
  }

  return (
    <svg
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      xmlns="http://www.w3.org/2000/svg"
      className={cn("select-none", className)}
      pointerEvents="none"
    >
      <rect x={0} y={0} width={VB_W} height={VB_H} fill="var(--color-map-ocean)" />
      {paths.map(({ id, d }) =>
        d ? (
          <CountryPath
            key={id || d.slice(0, 12)}
            d={d}
            variant={id === targetId ? "target" : "idle"}
          />
        ) : null
      )}
    </svg>
  )
}
