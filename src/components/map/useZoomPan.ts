import { useCallback, useRef, useState } from "react"

type Transform = { k: number; tx: number; ty: number }

type UseZoomPanOpts = {
  minScale?: number
  maxScale?: number
  enabled?: boolean
}

const IDENTITY: Transform = { k: 1, tx: 0, ty: 0 }

export function useZoomPan(opts: UseZoomPanOpts = {}) {
  const { minScale = 1, maxScale = 16, enabled = true } = opts
  const [t, setT] = useState<Transform>(IDENTITY)
  const drag = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null)

  const clamp = (k: number) => Math.min(maxScale, Math.max(minScale, k))

  const onWheel = useCallback(
    (e: React.WheelEvent<SVGSVGElement>) => {
      if (!enabled) return
      e.preventDefault()
      const svg = e.currentTarget
      const r = svg.getBoundingClientRect()
      const mx = ((e.clientX - r.left) / r.width) * svg.viewBox.baseVal.width
      const my = ((e.clientY - r.top) / r.height) * svg.viewBox.baseVal.height
      const factor = Math.exp(-e.deltaY * 0.0015)
      setT((prev) => {
        const nk = clamp(prev.k * factor)
        const scale = nk / prev.k
        return {
          k: nk,
          tx: mx - (mx - prev.tx) * scale,
          ty: my - (my - prev.ty) * scale,
        }
      })
    },
    [enabled, maxScale, minScale]
  )

  const onPointerDown = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!enabled) return
      // Only left button / primary touch
      if (e.button !== 0 && e.pointerType === "mouse") return
      ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
      drag.current = { x: e.clientX, y: e.clientY, tx: t.tx, ty: t.ty }
    },
    [enabled, t.tx, t.ty]
  )

  const onPointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!enabled || !drag.current) return
      const svg = e.currentTarget
      const r = svg.getBoundingClientRect()
      const scaleX = svg.viewBox.baseVal.width / r.width
      const scaleY = svg.viewBox.baseVal.height / r.height
      const dx = (e.clientX - drag.current.x) * scaleX
      const dy = (e.clientY - drag.current.y) * scaleY
      setT((prev) => ({
        k: prev.k,
        tx: drag.current!.tx + dx,
        ty: drag.current!.ty + dy,
      }))
    },
    [enabled]
  )

  const endDrag = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    const wasDragging =
      drag.current &&
      (Math.abs(e.clientX - drag.current.x) > 3 ||
        Math.abs(e.clientY - drag.current.y) > 3)
    drag.current = null
    return wasDragging ?? false
  }, [])

  const reset = useCallback(() => setT(IDENTITY), [])

  const onDoubleClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      e.preventDefault()
      reset()
    },
    [reset]
  )

  return {
    transform: t,
    reset,
    svgHandlers: {
      onWheel,
      onPointerDown,
      onPointerMove,
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
      onDoubleClick,
    },
    isDragging: () => drag.current != null,
  }
}
