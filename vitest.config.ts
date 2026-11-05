import { defineConfig } from "vitest/config"
import viteReact from "@vitejs/plugin-react"
import { stylexCompiler } from "./stylex-plugin.ts"

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [stylexCompiler, viteReact()],
  test: {
    environment: "jsdom",
    passWithNoTests: true,
    pool: "forks",
  },
})
