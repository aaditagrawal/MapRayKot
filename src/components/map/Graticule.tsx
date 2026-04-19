import { useMemo } from "react"
import { geoGraticule } from "d3-geo"
import type { GeoPath } from "d3-geo"

export function Graticule({ path }: { path: GeoPath }) {
  const d = useMemo(() => {
    const g = geoGraticule().step([15, 15])
    return path(g()) ?? ""
  }, [path])
  return (
    <path
      d={d}
      fill="none"
      stroke="var(--color-map-graticule)"
      strokeWidth={0.5}
      vectorEffect="non-scaling-stroke"
      pointerEvents="none"
    />
  )
}
