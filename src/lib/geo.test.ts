import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const payload = { type: 'FeatureCollection', features: [] }

afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetModules()
})

describe('world data subscription', () => {
  it('shares the pending request and publishes the resolved world', async () => {
    vi.resetModules()
    const fetchWorld = vi.fn().mockResolvedValue({ ok: true, json: async () => payload })
    vi.stubGlobal('fetch', fetchWorld)
    const { loadWorld, useWorld } = await import('./geo')
    const first = loadWorld()
    expect(loadWorld()).toBe(first)
    const { result, unmount } = renderHook(useWorld)
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.data?.features).toEqual([])
    expect(result.current.error).toBeNull()
    expect(fetchWorld).toHaveBeenCalledTimes(1)
    unmount()
  })

  it('publishes failure and retries without retaining the old error', async () => {
    vi.resetModules()
    const fetchWorld = vi.fn().mockRejectedValue(new Error('offline'))
    vi.stubGlobal('fetch', fetchWorld)
    const { useWorld } = await import('./geo')
    const { result, unmount } = renderHook(useWorld)
    await waitFor(() => expect(result.current.error?.message).toBe('offline'))
    expect(result.current.loading).toBe(false)
    fetchWorld.mockResolvedValue({ ok: true, json: async () => payload })
    act(() => result.current.retry())
    expect(result.current.loading).toBe(true)
    expect(result.current.error).toBeNull()
    await waitFor(() => expect(result.current.data?.features).toEqual([]))
    expect(result.current.loading).toBe(false)
    unmount()
  })
})
