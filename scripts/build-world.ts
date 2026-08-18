/**
 * One-shot preprocessor: world-atlas countries-50m + India-claim → public/world.json
 * Run: bun run scripts/build-world.ts
 */
import { readFileSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"
import { feature } from "topojson-client"
import polygonClipping from "polygon-clipping"
import simplify from "@turf/simplify"
import { ISO_META } from "./iso-meta.ts"
import type {
  Pair,
  MultiPolygon as PCMultiPolygon,
  Polygon as PCPolygon,
  Ring as PCRing,
} from "polygon-clipping"
import type {
  Feature,
  FeatureCollection,
  MultiPolygon,
  Polygon,
  Position,
} from "geojson"
import type { GeometryCollection, Topology } from "topojson-specification"

const root = resolve(import.meta.dirname, "..")
const worldAtlasPath = resolve(
  root,
  "node_modules/world-atlas/countries-50m.json"
)
const indiaClaimPath = resolve(root, "scripts/data/india-claim.geojson")
const outWorldPath = resolve(root, "public/world.json")
const outMetaPath = resolve(root, "public/world-meta.json")

const IN_ID = "356"
const PAK_ID = "586"
const CHN_ID = "156"

/**
 * Coordinates as polygon-clipping models them: lon/lat pairs rather than
 * GeoJSON `Position`, which is an open-ended `number[]` that may carry a third
 * (altitude) component. Everything downstream is 2D, so pairs are the contract.
 */
type MPCoords = PCMultiPolygon

/** Drop any altitude component; the clipper and the renderer are both 2D. */
function toPairRings(rings: Array<Array<Position>>): PCPolygon {
  return rings.map((ring) => ring.map((p): Pair => [p[0], p[1]]))
}

function toPairCoords(coords: Array<Array<Array<Position>>>): MPCoords {
  return coords.map(toPairRings)
}

function toMultiPolygonCoords(g: Polygon | MultiPolygon): MPCoords {
  if (g.type === "Polygon") return [toPairRings(g.coordinates)]
  return toPairCoords(g.coordinates)
}

function round(coords: MPCoords, dp = 5): MPCoords {
  const m = Math.pow(10, dp)
  return coords.map((poly) =>
    poly.map((ring) =>
      ring.map(([x, y]): Pair => [Math.round(x * m) / m, Math.round(y * m) / m])
    )
  )
}

/** Signed area of a ring (shoelace). Positive = CCW, negative = CW. */
function ringArea(ring: PCRing): number {
  let a = 0
  for (let i = 0, n = ring.length - 1; i < n; i++) {
    const [x1, y1] = ring[i]
    const [x2, y2] = ring[i + 1]
    a += x1 * y2 - x2 * y1
  }
  return a / 2
}

/**
 * d3-geo treats spherical polygons: a ring enclosing an area under a threshold
 * is interior, otherwise it flips. world-atlas ships outer rings as CW (-area)
 * in planar signed-area terms (lon/lat); that's what d3-geo expects.
 * polygon-clipping emits outer rings CCW (+area) — flip them to match.
 */
function fixWinding(coords: MPCoords): MPCoords {
  return coords.map((poly) =>
    poly.map((ring, i) => {
      const a = ringArea(ring)
      const wantCW = i === 0
      const isCW = a < 0
      return wantCW === isCW ? ring : [...ring].reverse()
    })
  )
}

/** The `properties` bag world-atlas ships on each country. */
type CountryProperties = { name?: string }

type WorldFeatures = FeatureCollection<
  Polygon | MultiPolygon,
  CountryProperties
>

function main() {
  console.log("[build-world] loading world-atlas…")
  // SAFETY: worldAtlasPath resolves inside node_modules/world-atlas, whose
  // countries-50m.json is published as a TopoJSON Topology. A shape mismatch
  // would be a broken install, and the `objects.countries` read below throws.
  const worldTopo = JSON.parse(readFileSync(worldAtlasPath, "utf8")) as Topology
  // SAFETY: countries-50m.json stores its `countries` object as a TopoJSON
  // GeometryCollection whose members all carry a `name` property.
  const countries = worldTopo.objects
    .countries as GeometryCollection<CountryProperties>
  // SAFETY: every geometry in that collection is a Polygon or MultiPolygon.
  // `feature()` is declared to return the whole GeometryObject union because it
  // is generic over any topology, so this file's narrower shape cannot be inferred.
  const fc = feature(worldTopo, countries) as WorldFeatures

  // Patch Kosovo (no id in world-atlas) with synthetic "-99".
  for (const f of fc.features) {
    if (!f.id && f.properties?.name === "Kosovo") {
      f.id = "-99"
    }
  }

  console.log(`[build-world] ${fc.features.length} features loaded`)

  console.log("[build-world] loading India claim geojson…")
  // SAFETY: indiaClaimPath is a checked-in asset under scripts/data, authored as
  // a GeoJSON FeatureCollection of Polygon/MultiPolygon claim outlines. The
  // union below throws on any geometry that is not one of those two.
  const indiaFc = JSON.parse(
    readFileSync(indiaClaimPath, "utf8")
  ) as FeatureCollection<Polygon | MultiPolygon>

  // Union all India-claim polygons.
  const indiaClaimInput: Array<MPCoords> = indiaFc.features.map((f) =>
    toMultiPolygonCoords(f.geometry)
  )
  console.log(
    `[build-world] unioning ${indiaClaimInput.length} India claim feature(s)…`
  )
  const indiaClaim = polygonClipping.union(
    indiaClaimInput[0],
    ...indiaClaimInput.slice(1)
  )

  // Simplify tolerance (degrees). 0.05° ≈ 5.5 km at the equator — matches 50m data.
  const SIMPLIFY_TOL = 0.05
  const simplifyMP = (coords: MPCoords): MPCoords => {
    const wrapped: FeatureCollection<MultiPolygon> = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {},
          geometry: { type: "MultiPolygon", coordinates: coords },
        },
      ],
    }
    const s = simplify(wrapped, { tolerance: SIMPLIFY_TOL, highQuality: false })
    return toPairCoords(s.features[0].geometry.coordinates)
  }

  // Diff PAK & CHN against the India claim, replace India with claim.
  const next: Array<Feature<Polygon | MultiPolygon>> = fc.features.map((f) => {
    if (f.id === IN_ID) {
      return {
        ...f,
        geometry: {
          type: "MultiPolygon",
          coordinates: fixWinding(round(simplifyMP(indiaClaim), 4)),
        },
      }
    }
    if (f.id === PAK_ID || f.id === CHN_ID) {
      const src = toMultiPolygonCoords(f.geometry)
      const diffed = polygonClipping.difference(src, indiaClaim)
      return {
        ...f,
        geometry: {
          type: "MultiPolygon",
          coordinates: fixWinding(round(simplifyMP(diffed), 4)),
        },
      }
    }
    // Round unchanged features to reduce file size.
    const src = toMultiPolygonCoords(f.geometry)
    const rounded = round(src, 3)
    return {
      ...f,
      geometry:
        f.geometry.type === "Polygon"
          ? { type: "Polygon", coordinates: rounded[0] }
          : { type: "MultiPolygon", coordinates: rounded },
    }
  })

  const outFc: FeatureCollection<Polygon | MultiPolygon> = {
    type: "FeatureCollection",
    features: next,
  }

  console.log("[build-world] writing FeatureCollection…")
  const worldJson = JSON.stringify(outFc)
  writeFileSync(outWorldPath, worldJson)
  console.log(
    `[build-world] wrote ${outWorldPath} (${(worldJson.length / 1024).toFixed(1)} KB)`
  )

  // Build metadata keyed on numeric id.
  const meta: Record<
    string,
    { name: string; iso2: string; iso3: string; aliases: Array<string> }
  > = {}
  for (const f of fc.features) {
    const id = String(f.id)
    const info = ISO_META.get(id)
    if (!info) continue
    meta[id] = {
      name: info.name,
      iso2: info.iso2,
      iso3: info.iso3,
      aliases: info.aliases,
    }
  }
  writeFileSync(outMetaPath, JSON.stringify(meta, null, 2))
  console.log(
    `[build-world] wrote ${outMetaPath} (${Object.keys(meta).length} entries)`
  )
}

main()
