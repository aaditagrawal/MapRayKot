import { useMemo } from "react"

import { makeProjection, pathGenerator, useWorld } from "@/lib/geo"
import { cn } from "@/lib/utils"

const VB_W = 960
const VB_H = 520

export function AtlasSilhouette({ className }: { className?: string }) {
  const world = useWorld()

  const paths = useMemo(() => {
    if (!world) return []
    const proj = makeProjection(VB_W, VB_H, {
      type: "FeatureCollection",
      features: world.features,
    })
    const path = pathGenerator(proj)
    return world.features.map((f) => path(f) ?? "")
  }, [world])

  if (!world) return null

  return (
    <svg
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      xmlns="http://www.w3.org/2000/svg"
      className={cn(
        "pointer-events-none select-none animate-in fade-in duration-700 fill-mode-both",
        className
      )}
      aria-hidden
    >
      {paths.map((d, i) => (
        <path
          key={i}
          d={d}
          fill="currentColor"
          stroke="currentColor"
          strokeWidth={0.5}
          vectorEffect="non-scaling-stroke"
          fillOpacity={0.85}
          strokeOpacity={0.55}
        />
      ))}
    </svg>
  )
}
