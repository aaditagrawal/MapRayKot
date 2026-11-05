import * as stylex from "@stylexjs/stylex"
import { describe, expect, it } from "vitest"
import { classNames, styles } from "@/ui.stylex"
import { cn } from "./utils"

describe("component class composition", () => {
  it("keeps literal classes, discards conditional gaps and normalizes whitespace", () => {
    const inputs: Array<string | false | null | undefined> = [
      "custom\tother",
      false,
      undefined,
      null,
      "",
      "last",
    ]
    expect(cn(...inputs)).toBe("custom other last")
    expect(cn(false, undefined, null, "")).toBe("")
  })

  it("keeps caller overrides in StyleX order without duplicating atomic classes", () => {
    const base = classNames.componentsUiButton70
    const override = classNames.componentsUiButton77
    const caller = "group"
    const expected = stylex.props(
      styles.componentsUiButton70,
      styles.componentsUiButton77
    ).className
    expect(cn(base, override, caller)).toBe(
      `${expected} map-componentsUiButton70 group/button text-defined map-componentsUiButton77 group`
    )
    expect(cn(override, base)).toBe(
      `${stylex.props(styles.componentsUiButton77, styles.componentsUiButton70).className} map-componentsUiButton77 map-componentsUiButton70 group/button text-defined`
    )
  })
})
