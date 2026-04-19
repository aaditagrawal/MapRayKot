import type { GeoProjection } from "d3-geo"

type Props = {
  projection: GeoProjection
  click: [number, number]
  nearest: [number, number] | null
  inside: boolean
  /** Current zoom scale of the parent <g>; markers shrink in viewBox to keep constant on-screen size. */
  scale?: number
}

export function ResultMarker({
  projection,
  click,
  nearest,
  inside,
  scale = 1,
}: Props) {
  const c = projection(click)
  if (!c) return null
  const n = nearest ? projection(nearest) : null
  const k = Math.max(scale, 0.0001)
  const rClick = 4.5 / k
  const rNearest = 3.5 / k
  const dash = `${3 / k} ${3 / k}`
  return (
    <g pointerEvents="none">
      {n && !inside && (
        <line
          x1={c[0]}
          y1={c[1]}
          x2={n[0]}
          y2={n[1]}
          stroke="var(--color-map-wrong)"
          strokeWidth={1.2}
          strokeDasharray={dash}
          vectorEffect="non-scaling-stroke"
        />
      )}
      {n && !inside && (
        <circle
          cx={n[0]}
          cy={n[1]}
          r={rNearest}
          fill="var(--color-map-correct)"
          stroke="var(--color-background)"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
      )}
      <circle
        cx={c[0]}
        cy={c[1]}
        r={rClick}
        fill={inside ? "var(--color-map-correct)" : "var(--color-map-target)"}
        stroke="var(--color-background)"
        strokeWidth={1.25}
        vectorEffect="non-scaling-stroke"
      />
    </g>
  )
}
