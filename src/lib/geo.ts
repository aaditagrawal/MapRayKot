import { useEffect, useState } from "react"
import { geoBounds, geoCentroid, geoContains, geoEqualEarth, geoPath } from "d3-geo"
import type { GeoPermissibleObjects, GeoProjection } from "d3-geo"
import type {
  Feature,
  FeatureCollection,
  MultiPolygon,
  Polygon,
} from "geojson"

export type CountryFeature = Feature<
  Polygon | MultiPolygon,
  { name?: string }
>

export type WorldData = {
  features: Array<CountryFeature>
  featuresById: Map<string, CountryFeature>
  indiaFeature: CountryFeature | null
}

let cache: Promise<WorldData> | null = null

export function loadWorld(): Promise<WorldData> {
  if (cache) return cache
  cache = (async () => {
    const res = await fetch("/world.json")
    if (!res.ok) throw new Error(`failed to load world.json: ${res.status}`)
    const fc = (await res.json()) as FeatureCollection<
      Polygon | MultiPolygon,
      { name?: string }
    >
    const features = fc.features as Array<CountryFeature>
    const featuresById = new Map<string, CountryFeature>()
    for (const f of features) {
      if (f.id != null) featuresById.set(String(f.id), f)
    }
    const indiaFeature = featuresById.get("356") ?? null
    return { features, featuresById, indiaFeature }
  })()
  return cache
}

export function useWorld(): WorldData | null {
  const [data, setData] = useState<WorldData | null>(null)
  useEffect(() => {
    let cancelled = false
    loadWorld().then((d) => {
      if (!cancelled) setData(d)
    })
    return () => {
      cancelled = true
    }
  }, [])
  return data
}

if (typeof window !== "undefined") {
  void loadWorld()
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

export function featureBounds(f: CountryFeature): [[number, number], [number, number]] {
  return geoBounds(f)
}
