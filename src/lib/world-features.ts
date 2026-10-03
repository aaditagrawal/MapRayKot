import type { Feature, MultiPolygon, Polygon } from "geojson"

type CountryFeature = Feature<Polygon | MultiPolygon, { name?: string }>

/** Combine mainland and territory geometry sharing the same country ID. */
export function mergeCountryFeatures(
  features: CountryFeature[]
): CountryFeature[] {
  const merged = new Map<string, CountryFeature>()
  const anonymous: CountryFeature[] = []
  for (const feature of features) {
    if (feature.id == null) {
      anonymous.push(feature)
      continue
    }
    const id = String(feature.id)
    const existing = merged.get(id)
    if (!existing) {
      merged.set(id, feature)
      continue
    }
    const polygons = (geometry: Polygon | MultiPolygon) =>
      geometry.type === "Polygon"
        ? [geometry.coordinates]
        : geometry.coordinates
    merged.set(id, {
      ...existing,
      geometry: {
        type: "MultiPolygon",
        coordinates: [
          ...polygons(existing.geometry),
          ...polygons(feature.geometry),
        ],
      },
    })
  }
  return [...merged.values(), ...anonymous]
}
