import { geoContains } from "d3-geo"
import type { CountryFeature } from "./geo"
import type { Position } from "geojson"

const EARTH_KM = 6371

function toRad(d: number): number {
  return (d * Math.PI) / 180
}

/** Great-circle distance in km. */
export function haversineKm(a: [number, number], b: [number, number]): number {
  const [lon1, lat1] = a
  const [lon2, lat2] = b
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const la1 = toRad(lat1)
  const la2 = toRad(lat2)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2
  return 2 * EARTH_KM * Math.asin(Math.min(1, Math.sqrt(h)))
}

/**
 * Approximate distance in km from a lon/lat point to the nearest point on a
 * segment, using planar geometry scaled by cosine of latitude. Good enough
 * for scoring; fine for segments < a few hundred km.
 */
function pointSegDistKm(
  p: [number, number],
  a: [number, number],
  b: [number, number]
): [number, [number, number]] {
  const latScale = Math.cos(toRad((a[1] + b[1]) / 2))
  const ax = a[0] * latScale, ay = a[1]
  const bx = b[0] * latScale, by = b[1]
  const px = p[0] * latScale, py = p[1]
  const dx = bx - ax
  const dy = by - ay
  const denom = dx * dx + dy * dy
  let t = denom === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / denom
  t = Math.max(0, Math.min(1, t))
  const cx = ax + t * dx
  const cy = ay + t * dy
  const nearest: [number, number] = [cx / latScale, cy]
  return [haversineKm(p, nearest), nearest]
}

function* iterRings(feature: CountryFeature): Generator<Array<Position>> {
  const g = feature.geometry
  if (g.type === "Polygon") {
    for (const ring of g.coordinates) yield ring
  } else {
    for (const poly of g.coordinates) for (const ring of poly) yield ring
  }
}

/** Returns { inside, km, nearest } — km=0 and nearest=click when inside. */
export function distanceToFeature(
  click: [number, number],
  feature: CountryFeature
): { inside: boolean; km: number; nearest: [number, number] } {
  if (geoContains(feature, click)) {
    return { inside: true, km: 0, nearest: click }
  }
  let best = Number.POSITIVE_INFINITY
  let bestPt: [number, number] = click
  for (const ring of iterRings(feature)) {
    for (let i = 0; i < ring.length - 1; i++) {
      const a = ring[i] as [number, number]
      const b = ring[i + 1] as [number, number]
      const [km, pt] = pointSegDistKm(click, a, b)
      if (km < best) {
        best = km
        bestPt = pt
      }
    }
  }
  return { inside: false, km: best, nearest: bestPt }
}

/** Tiered score: inside=1000, ≤500km linear 1000→500, ≤2000 500→100, ≤5000 100→0, else 0. */
export function scoreForDistanceKm(km: number, inside: boolean): number {
  if (inside) return 1000
  if (km <= 500) return Math.round(1000 - (km / 500) * 500)
  if (km <= 2000) return Math.round(500 - ((km - 500) / 1500) * 400)
  if (km <= 5000) return Math.round(100 - ((km - 2000) / 3000) * 100)
  return 0
}

export const LOCATE_MAX_PER_TURN = 1000
