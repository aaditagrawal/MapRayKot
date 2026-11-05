// Run with the project's pinned Node: node scripts/benchmark-dependencies.mjs
// Baseline packages live only in an OS temp directory, never in the app graph.
import { strict as assert } from "node:assert"
import { execFileSync } from "node:child_process"
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { performance } from "node:perf_hooks"
import { createServer } from "vite"
import viteReact from "@vitejs/plugin-react"
import { stylexCompiler } from "../stylex-plugin.ts"

// Match the shipped application rather than React development diagnostics.
process.env.NODE_ENV = "production"

const base = "ab3d230052b4ebc3ec3e883808c37b3c30406c93"
const root = resolve(import.meta.dirname, "..")
const pinnedNode = readFileSync(join(root, ".node-version"), "utf8").trim()
if (process.version !== `v${pinnedNode}`)
  throw new Error(`Use Node ${pinnedNode}`)
const temp = join(tmpdir(), "mapraykot-dependency-benchmark")
mkdirSync(temp, { recursive: true })
writeFileSync(
  join(temp, "package.json"),
  JSON.stringify({
    private: true,
    type: "module",
    dependencies: {
      clsx: "2.1.1",
      "class-variance-authority": "0.7.1",
      "radix-ui": "1.8.1",
      react: "19.3.1",
      "react-dom": "19.3.1",
    },
  })
)
execFileSync(
  "bun",
  [
    "install",
    ...(existsSync(join(temp, "bun.lock")) ? ["--frozen-lockfile"] : []),
    "--cwd",
    temp,
  ],
  { stdio: "pipe" }
)
for (const [source, target] of [
  ["src/lib/utils.ts", "baseline-utils.ts"],
  ["src/components/ui/button.tsx", "baseline-button.tsx"],
]) {
  const code = execFileSync("git", ["show", `${base}:${source}`], {
    cwd: root,
    encoding: "utf8",
  })
    .replaceAll('"@/ui.stylex"', JSON.stringify(join(root, "src/ui.stylex.ts")))
    .replaceAll(
      '"@/lib/utils"',
      JSON.stringify(join(temp, "baseline-utils.ts"))
    )
    .replaceAll(
      '"@stylexjs/stylex"',
      JSON.stringify(
        join(root, "node_modules/@stylexjs/stylex/lib/es/stylex.mjs")
      )
    )
  writeFileSync(join(temp, target), code)
}
const server = await createServer({
  configFile: false,
  mode: "production",
  root,
  logLevel: "error",
  resolve: { tsconfigPaths: true },
  plugins: [stylexCompiler, viteReact()],
  server: { middlewareMode: true, hmr: false, ws: false },
})
try {
  const oldButton = (
    await server.ssrLoadModule(join(temp, "baseline-button.tsx"))
  ).Button
  const newButton = (
    await server.ssrLoadModule(join(root, "src/components/ui/button.tsx"))
  ).Button
  const { classNames } = await server.ssrLoadModule(
    join(root, "src/ui.stylex.ts")
  )
  const { createElement } = await import("react")
  const { renderToString } = await import("react-dom/server")
  assert.equal(server.config.isProduction, true)
  assert.equal(oldButton.toString().includes("jsxDEV"), false)
  assert.equal(newButton.toString().includes("jsxDEV"), false)
  // Preserve every exported variant/size pair, including null's omission semantics.
  for (const variant of [
    undefined,
    null,
    "default",
    "outline",
    "secondary",
    "ghost",
    "destructive",
    "link",
  ]) {
    for (const size of [
      undefined,
      null,
      "default",
      "xs",
      "sm",
      "lg",
      "icon",
      "icon-xs",
      "icon-sm",
      "icon-lg",
    ]) {
      const props = {
        variant,
        size,
        className: classNames.routesPlayLocate217,
        children: "Play",
      }
      assert.equal(
        renderToString(createElement(newButton, props)),
        renderToString(createElement(oldButton, props))
      )
    }
  }
  let sink = 0
  const results = []
  const samples = process.argv.includes("--quick") ? 9 : 25
  const percentile = (values, fraction) =>
    values.toSorted((a, b) => a - b)[Math.floor((values.length - 1) * fraction)]
  function measure(name, oldRun, newRun, iterations) {
    if (process.argv.includes("--quick"))
      iterations = Math.max(50, Math.floor(iterations / 5))
    assert.deepEqual(newRun(), oldRun(), `${name} behavior`)
    for (let warmup = 0; warmup < 1000; warmup++) {
      oldRun()
      newRun()
    }
    const timings = [[], []]
    const cpuTimings = [[], []]
    for (let sample = 0; sample < samples; sample++) {
      for (const index of sample % 2 ? [1, 0] : [0, 1]) {
        const operation = index ? newRun : oldRun
        const cpuStart = process.cpuUsage()
        const start = performance.now()
        for (let iteration = 0; iteration < iterations; iteration++) {
          const value = operation()
          sink += value.length
        }
        timings[index].push((performance.now() - start) / iterations)
        const cpu = process.cpuUsage(cpuStart)
        cpuTimings[index].push((cpu.user + cpu.system) / 1000 / iterations)
      }
    }
    const summarize = (values) => ({
      median_ms: percentile(values, 0.5),
      p95_ms: percentile(values, 0.95),
      min_ms: Math.min(...values),
      max_ms: Math.max(...values),
    })
    const old = { ...summarize(timings[0]), cpu: summarize(cpuTimings[0]) }
    const current = { ...summarize(timings[1]), cpu: summarize(cpuTimings[1]) }
    console.error(
      `${name}: wall ${current.median_ms / old.median_ms}, CPU ${current.cpu.median_ms / old.cpu.median_ms}`
    )
    results.push({
      workload: name,
      iterations,
      samples,
      baseline: old,
      candidate: current,
      ratio: current.median_ms / old.median_ms,
    })
  }
  for (const [name, props] of [
    ["button/default", { children: "Play" }],
    [
      "button/outline",
      {
        variant: "outline",
        size: "sm",
        className: "caller",
        children: "Retry",
        disabled: true,
      },
    ],
  ]) {
    measure(
      `${name}/operation`,
      () => oldButton(props).props.className,
      () => newButton(props).props.className,
      1000
    )
    measure(
      `${name}/render`,
      () => renderToString(createElement(oldButton, props)),
      () => renderToString(createElement(newButton, props)),
      300
    )
  }
  console.log(
    JSON.stringify(
      {
        baseline_ref: base,
        parity_cases: 80,
        warmup_pairs: 1000,
        mode: "production",
        environment: {
          node: process.version,
          platform: process.platform,
          arch: process.arch,
        },
        setup:
          "git-show baseline, pinned packages in temporary directory; Vite/StyleX compilation and installation excluded from warm steady-state timings",
        samples,
        results,
        sink,
      },
      null,
      2
    )
  )
} finally {
  await server.close()
}
