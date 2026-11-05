import { createRef } from "react"
import { cleanup, fireEvent, render } from "@testing-library/react"
import { renderToString } from "react-dom/server"
import { afterEach, describe, expect, it, vi } from "vitest"
import { classNames } from "@/ui.stylex"
import { cn } from "@/lib/utils"
import { Button } from "./button"

afterEach(cleanup)

describe("native Button", () => {
  it("preserves default variants and server markup", () => {
    const { getByRole } = render(<Button>Play</Button>)
    const button = getByRole("button", { name: "Play" })
    expect(button.getAttribute("class")).toBe(
      cn(
        classNames.componentsUiButton70,
        classNames.componentsUiBadge64,
        classNames.componentsUiButton75
      )
    )
    expect(button.dataset.variant).toBe("default")
    expect(button.dataset.size).toBe("default")
    expect(renderToString(<Button>Play</Button>)).toContain(
      'data-slot="button"'
    )
  })

  it("preserves classes, refs, disabled state and event handling", () => {
    const ref = createRef<HTMLButtonElement>()
    const onClick = vi.fn()
    const { getByRole, rerender } = render(
      <Button
        variant="outline"
        size="sm"
        className="caller"
        ref={ref}
        aria-label="Retry"
        onClick={onClick}
      />
    )
    const button = getByRole("button", { name: "Retry" })
    expect(ref.current).toBe(button)
    expect(button.className).toBe(
      cn(
        classNames.componentsUiButton70,
        classNames.componentsUiButton71,
        classNames.componentsUiButton77,
        "caller"
      )
    )
    button.focus()
    expect(document.activeElement).toBe(button)
    fireEvent.click(button)
    expect(onClick).toHaveBeenCalledTimes(1)
    rerender(<Button disabled aria-label="Retry" onClick={onClick} />)
    fireEvent.click(button)
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it("allows null to omit a variant while retaining native form submission", () => {
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault())
    const { getByRole } = render(
      <form onSubmit={onSubmit}>
        <Button variant={null} size={null}>
          Submit
        </Button>
      </form>
    )
    const button = getByRole("button")
    expect(button.className).toBe(cn(classNames.componentsUiButton70))
    expect(button.hasAttribute("data-variant")).toBe(false)
    expect(button.hasAttribute("data-size")).toBe(false)
    fireEvent.click(button)
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })
})
