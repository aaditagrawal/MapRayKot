import type { GeoProjection } from "d3-geo"

type Props = {
  projection: GeoProjection
  click: [number, number]
  nearest: [number, number] | null
  inside: boolean
}

export function ResultMarker({ projection, click, nearest, inside }: Props) {
  const c = projection(click)
  if (!c) return null
  const n = nearest ? projection(nearest) : null
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
          strokeDasharray="3 3"
          vectorEffect="non-scaling-stroke"
        />
      )}
      {n && !inside && (
        <circle
          cx={n[0]}
          cy={n[1]}
          r={3.5}
          fill="var(--color-map-correct)"
          stroke="var(--color-background)"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
      )}
      <circle
        cx={c[0]}
        cy={c[1]}
        r={4.5}
        fill={inside ? "var(--color-map-correct)" : "var(--color-map-target)"}
        stroke="var(--color-background)"
        strokeWidth={1.25}
        vectorEffect="non-scaling-stroke"
      />
    </g>
  )
}
