import { useCallback, useEffect, useState } from "react"
import {
  geoBounds,
  geoCentroid,
  geoContains,
  geoEqualEarth,
  geoPath,
} from "d3-geo"
import type { GeoPermissibleObjects, GeoProjection } from "d3-geo"
import type { Feature, MultiPolygon, Polygon } from "geojson"

export type CountryFeature = Feature<Polygon | MultiPolygon, { name?: string }>

export type WorldData = {
  features: Array<CountryFeature>
  featuresById: Map<string, CountryFeature>
  indiaFeature: CountryFeature | null
}

let cache: Promise<WorldData> | null = null
let resolved: WorldData | null = null

export function loadWorld(): Promise<WorldData> {
  if (cache) return cache
  const p = (async () => {
    const res = await fetch("/world.json")
    if (!res.ok)
      throw new Error(`failed to load world data (HTTP ${res.status})`)
    const payload = await res.json()
    // `/world.json` is a build artifact written by scripts/build-world.ts, which
    // emits only Polygon/MultiPolygon country features. Reject anything that is
    // not the expected FeatureCollection before the rest of the app relies on it.
    if (!Array.isArray(payload?.features)) {
      throw new Error("world data is not a FeatureCollection")
    }
    const features: Array<CountryFeature> = payload.features
    const featuresById = new Map<string, CountryFeature>()
    for (const f of features) {
      if (f.id != null) featuresById.set(String(f.id), f)
    }
    const indiaFeature = featuresById.get("356") ?? null
    const data: WorldData = { features, featuresById, indiaFeature }
    resolved = data
    return data
  })()
  p.catch(() => {
    if (cache === p) cache = null
  })
  cache = p
  return p
}

export type WorldState = {
  data: WorldData | null
  error: Error | null
  loading: boolean
  retry: () => void
}

export function useWorld(): WorldState {
  const [data, setData] = useState<WorldData | null>(() => resolved)
  const [error, setError] = useState<Error | null>(null)
  const [loading, setLoading] = useState(() => resolved == null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    if (resolved && attempt === 0) {
      setData(resolved)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    void (async () => {
      try {
        const d = await loadWorld()
        if (cancelled) return
        setData(d)
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err : new Error(String(err)))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [attempt])

  const retry = useCallback(() => setAttempt((n) => n + 1), [])

  return { data, error, loading, retry }
}

if ("window" in globalThis) {
  void loadWorld().catch(() => {
    /* surfaced via useWorld() */
  })
}

/** Equal Earth projection fitted into a [w,h] viewbox around the given features. */
export function makeProjection(
  width: number,
  height: number,
  fitTarget: GeoPermissibleObjects
): GeoProjection {
  return geoEqualEarth().fitSize([width, height], fitTarget)
}

/** Ordered hit-test: India claim first, then the rest. Returns first containing feature. */
export function hitTest(
  lonLat: [number, number],
  world: WorldData
): CountryFeature | null {
  if (world.indiaFeature && geoContains(world.indiaFeature, lonLat)) {
    return world.indiaFeature
  }
  for (const f of world.features) {
    if (f === world.indiaFeature) continue
    if (geoContains(f, lonLat)) return f
  }
  return null
}

/** Memoization helper keyed by feature identity. */
export function pathGenerator(projection: GeoProjection) {
  return geoPath(projection)
}

export function featureCentroid(f: CountryFeature): [number, number] {
  return geoCentroid(f)
}

export function featureBounds(
  f: CountryFeature
): [[number, number], [number, number]] {
  return geoBounds(f)
}
