import { expect, test } from "vitest"
import { readFileSync } from "node:fs"
import { geoContains } from "d3-geo"
import { mergeCountryFeatures } from "./world-features"

test("Australia includes mainland and island geometry under one ID", () => {
  const source = JSON.parse(readFileSync("public/world.json", "utf8"))
  const features = mergeCountryFeatures(source.features)
  const australia = features.find((feature) => String(feature.id) === "036")
  expect(australia).toBeDefined()
  expect(
    features.filter((feature) => String(feature.id) === "036")
  ).toHaveLength(1)
  expect(geoContains(australia!, [133, -25])).toBe(true)
  const islands = source.features.find(
    (feature: { id: string; properties: { name: string } }) =>
      feature.id === "036" && feature.properties.name.includes("Ashmore")
  )
  expect(australia!.geometry.coordinates.length).toBeGreaterThan(
    islands.geometry.coordinates.length
  )
})
