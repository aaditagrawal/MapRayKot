import { transformAsync } from "@babel/core"
import type { Plugin } from "vite"
import { stylexOptions } from "./stylex.config.mjs"

// Compile the same component classes in the application and its behavior tests.
export const stylexCompiler: Plugin = {
  name: "stylex-compiler",
  enforce: "pre",
  async transform(code, id) {
    if (!id.endsWith("/ui.stylex.ts")) return null
    const result = await transformAsync(code, {
      filename: id,
      configFile: false,
      babelrc: false,
      parserOpts: { plugins: ["typescript"] },
      plugins: [["@stylexjs/babel-plugin", stylexOptions]],
      sourceMaps: true,
    })
    return result?.code ? { code: result.code, map: result.map } : null
  },
}
