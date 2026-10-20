import { classNames } from "@/ui.stylex"
import { useTheme } from "next-themes"
import { useSyncExternalStore } from "react"
import { RiMoonLine, RiSunLine } from "@remixicon/react"

import { Button } from "@/components/ui/button"

const subscribeToClient = () => () => {}
const clientSnapshot = () => true
const serverSnapshot = () => false

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const mounted = useSyncExternalStore(
    subscribeToClient,
    clientSnapshot,
    serverSnapshot
  )

  const isDark = mounted && resolvedTheme === "dark"

  return (
    <Button
      variant="outline"
      size="icon-sm"
      aria-label="Toggle theme"
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {mounted ? (
        isDark ? (
          <RiSunLine />
        ) : (
          <RiMoonLine />
        )
      ) : (
        <RiMoonLine className={classNames.componentsThemeToggle62} />
      )}
    </Button>
  )
}
