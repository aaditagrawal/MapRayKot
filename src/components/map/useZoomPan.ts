import { useCallback, useRef, useState } from "react"

type Transform = { k: number; tx: number; ty: number }

type UseZoomPanOpts = {
  minScale?: number
  maxScale?: number
  enabled?: boolean
  /** ViewBox dimensions used for bounds clamping so content can't escape. */
  vbW: number
  vbH: number
}

const IDENTITY: Transform = { k: 1, tx: 0, ty: 0 }
/** Pixel movement (viewport coords) past which we count a gesture as a drag, not a tap. */
const TAP_SLOP_PX = 6

type Pointer = { x: number; y: number }
type PinchState = {
  startDist: number
  startK: number
  startMidVB: { x: number; y: number }
  startTx: number
  startTy: number
}
type PanState = {
  pointerId: number
  startX: number
  startY: number
  startTx: number
  startTy: number
}

function distance(a: Pointer, b: Pointer): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return Math.hypot(dx, dy)
}

function midpoint(a: Pointer, b: Pointer): Pointer {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

function clientToViewBox(
  client: Pointer,
  rect: DOMRect,
  vbW: number,
  vbH: number
): Pointer {
  return {
    x: ((client.x - rect.left) / rect.width) * vbW,
    y: ((client.y - rect.top) / rect.height) * vbH,
  }
}

export function useZoomPan(opts: UseZoomPanOpts) {
  const { minScale = 1, maxScale = 16, enabled = true, vbW, vbH } = opts
  const [t, setT] = useState<Transform>(IDENTITY)

  const pointers = useRef(new Map<number, Pointer>())
  const pinch = useRef<PinchState | null>(null)
  const pan = useRef<PanState | null>(null)
  const moved = useRef(false)
  const downAt = useRef<Pointer | null>(null)

  const clampScale = useCallback(
    (k: number) => Math.min(maxScale, Math.max(minScale, k)),
    [maxScale, minScale]
  )

  /** Keep the map content covering the viewport — no pannable ocean past the edges. */
  const clampTransform = useCallback(
    (next: Transform): Transform => {
      const k = clampScale(next.k)
      const minTx = vbW * (1 - k)
      const minTy = vbH * (1 - k)
      const tx = Math.min(0, Math.max(minTx, next.tx))
      const ty = Math.min(0, Math.max(minTy, next.ty))
      return { k, tx, ty }
    },
    [clampScale, vbW, vbH]
  )

  /** Imperative wheel handler — attach via addEventListener with {passive: false}. */
  const wheelHandler = useCallback(
    (e: WheelEvent) => {
      if (!enabled) return
      const svg = e.currentTarget as SVGSVGElement | null
      if (!svg) return
      e.preventDefault()
      const r = svg.getBoundingClientRect()
      const m = clientToViewBox({ x: e.clientX, y: e.clientY }, r, vbW, vbH)
      const factor = Math.exp(-e.deltaY * 0.0015)
      setT((prev) => {
        const nk = clampScale(prev.k * factor)
        const scale = nk / prev.k
        return clampTransform({
          k: nk,
          tx: m.x - (m.x - prev.tx) * scale,
          ty: m.y - (m.y - prev.ty) * scale,
        })
      })
    },
    [enabled, clampScale, clampTransform, vbW, vbH]
  )

  const beginPinchFromPointers = useCallback(
    (svg: SVGSVGElement) => {
      const arr = Array.from(pointers.current.values())
      if (arr.length < 2) return
      const [a, b] = arr
      const r = svg.getBoundingClientRect()
      const midClient = midpoint(a, b)
      const midVB = clientToViewBox(midClient, r, vbW, vbH)
      pinch.current = {
        startDist: Math.max(1, distance(a, b)),
        startK: t.k,
        startMidVB: midVB,
        startTx: t.tx,
        startTy: t.ty,
      }
      pan.current = null
      moved.current = true
    },
    [t.k, t.tx, t.ty, vbW, vbH]
  )

  const onPointerDown = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!enabled) return
      if (e.button !== 0 && e.pointerType === "mouse") return
      const svg = e.currentTarget
      svg.setPointerCapture(e.pointerId)
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

      if (pointers.current.size === 1) {
        downAt.current = { x: e.clientX, y: e.clientY }
        moved.current = false
        pan.current = {
          pointerId: e.pointerId,
          startX: e.clientX,
          startY: e.clientY,
          startTx: t.tx,
          startTy: t.ty,
        }
      } else if (pointers.current.size === 2) {
        beginPinchFromPointers(svg)
      }
    },
    [enabled, t.tx, t.ty, beginPinchFromPointers]
  )

  const onPointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!enabled) return
      if (!pointers.current.has(e.pointerId)) return
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

      const svg = e.currentTarget
      const r = svg.getBoundingClientRect()

      if (pinch.current && pointers.current.size >= 2) {
        const arr = Array.from(pointers.current.values())
        const [a, b] = arr
        const curDist = Math.max(1, distance(a, b))
        const curMidVB = clientToViewBox(midpoint(a, b), r, vbW, vbH)
        const factor = curDist / pinch.current.startDist
        const nk = clampScale(pinch.current.startK * factor)
        const scale = nk / pinch.current.startK
        // Anchor zoom at the original midpoint, then translate by midpoint drift.
        const tx =
          pinch.current.startMidVB.x -
          (pinch.current.startMidVB.x - pinch.current.startTx) * scale +
          (curMidVB.x - pinch.current.startMidVB.x)
        const ty =
          pinch.current.startMidVB.y -
          (pinch.current.startMidVB.y - pinch.current.startTy) * scale +
          (curMidVB.y - pinch.current.startMidVB.y)
        setT(clampTransform({ k: nk, tx, ty }))
        moved.current = true
        return
      }

      if (pan.current && pointers.current.size === 1 && pan.current.pointerId === e.pointerId) {
        const scaleX = vbW / r.width
        const scaleY = vbH / r.height
        const dxClient = e.clientX - pan.current.startX
        const dyClient = e.clientY - pan.current.startY
        if (
          !moved.current &&
          (Math.abs(dxClient) > TAP_SLOP_PX || Math.abs(dyClient) > TAP_SLOP_PX)
        ) {
          moved.current = true
        }
        setT(
          clampTransform({
            k: t.k,
            tx: pan.current.startTx + dxClient * scaleX,
            ty: pan.current.startTy + dyClient * scaleY,
          })
        )
      }
    },
    [enabled, clampScale, clampTransform, t.k, vbW, vbH]
  )

  const endPointer = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    pointers.current.delete(e.pointerId)
    const remaining = pointers.current.size
    const wasMoved = moved.current
    if (remaining === 0) {
      pan.current = null
      pinch.current = null
      moved.current = false
      downAt.current = null
      return wasMoved
    }
    if (remaining === 1) {
      // Just exited pinch; user must lift the last finger before pan resumes.
      pinch.current = null
      pan.current = null
    }
    return true
  }, [])

  const reset = useCallback(() => setT(IDENTITY), [])

  const zoomBy = useCallback(
    (factor: number) => {
      setT((prev) => {
        const nk = clampScale(prev.k * factor)
        const scale = nk / prev.k
        // Anchor zoom at the viewport center (in viewBox coords).
        const cx = vbW / 2
        const cy = vbH / 2
        return clampTransform({
          k: nk,
          tx: cx - (cx - prev.tx) * scale,
          ty: cy - (cy - prev.ty) * scale,
        })
      })
    },
    [clampScale, clampTransform, vbW, vbH]
  )

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
    zoomIn: () => zoomBy(1.5),
    zoomOut: () => zoomBy(1 / 1.5),
    canZoomIn: t.k < maxScale - 1e-3,
    canZoomOut: t.k > minScale + 1e-3,
    wheelHandler,
    svgHandlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: endPointer,
      onPointerCancel: endPointer,
      onDoubleClick,
    },
  }
}
