import { vi, describe, it, expect, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { NodeVisualMode } from '../types/nodeVisualMode'

vi.mock('reactflow', () => ({
  useViewport: vi.fn(),
}))

import { useViewport } from 'reactflow'
import { useDisplayMode, ZOOM_THRESHOLDS } from '../hooks/useDisplayMode'

const mockZoom = (zoom: number) => {
  vi.mocked(useViewport).mockReturnValue({ zoom, x: 0, y: 0 })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useDisplayMode — mode classification', () => {
  it('returns "full" at a zoom level at or above the full threshold', () => {
    mockZoom(ZOOM_THRESHOLDS.FULL)
    const { result } = renderHook(() => useDisplayMode())
    expect(result.current.mode).toBe('full')
  })

  it('returns "full" well above the threshold', () => {
    mockZoom(2.0)
    const { result } = renderHook(() => useDisplayMode())
    expect(result.current.mode).toBe('full')
  })

  it('returns "compact" in the mid-range zoom band', () => {
    mockZoom(0.5) // between CLUSTER (0.18) and FULL (0.9)
    const { result } = renderHook(() => useDisplayMode())
    expect(result.current.mode).toBe('compact')
  })

  it('returns "compact" exactly at the cluster threshold', () => {
    mockZoom(ZOOM_THRESHOLDS.CLUSTER)
    const { result } = renderHook(() => useDisplayMode())
    expect(result.current.mode).toBe('compact')
  })

  it('returns "cluster" below the cluster threshold', () => {
    mockZoom(ZOOM_THRESHOLDS.CLUSTER - 0.01)
    const { result } = renderHook(() => useDisplayMode())
    expect(result.current.mode).toBe('cluster')
  })

  it('returns "cluster" at a very low zoom', () => {
    mockZoom(0.05)
    const { result } = renderHook(() => useDisplayMode())
    expect(result.current.mode).toBe('cluster')
  })
})

describe('useDisplayMode — isFull flag', () => {
  it('is true when zoom is at or above the full threshold', () => {
    mockZoom(1.0)
    const { result } = renderHook(() => useDisplayMode())
    expect(result.current.isFull).toBe(true)
  })

  it('is false in compact range', () => {
    mockZoom(0.5)
    const { result } = renderHook(() => useDisplayMode())
    expect(result.current.isFull).toBe(false)
  })
})

describe('useDisplayMode — isCluster flag', () => {
  it('is true below the cluster threshold', () => {
    mockZoom(0.1)
    const { result } = renderHook(() => useDisplayMode())
    expect(result.current.isCluster).toBe(true)
  })

  it('is false in compact range', () => {
    mockZoom(0.5)
    const { result } = renderHook(() => useDisplayMode())
    expect(result.current.isCluster).toBe(false)
  })
})

describe('useDisplayMode — nodeVisualMode', () => {
  it('is FULL_CARD at high zoom', () => {
    mockZoom(1.0)
    const { result } = renderHook(() => useDisplayMode())
    expect(result.current.nodeVisualMode).toBe(NodeVisualMode.FULL_CARD)
  })

  it('is COMPACT_CARD at mid zoom', () => {
    mockZoom(0.5)
    const { result } = renderHook(() => useDisplayMode())
    expect(result.current.nodeVisualMode).toBe(NodeVisualMode.COMPACT_CARD)
  })
})

describe('useDisplayMode — zoom passthrough', () => {
  it('exposes the raw zoom value from useViewport', () => {
    mockZoom(0.73)
    const { result } = renderHook(() => useDisplayMode())
    expect(result.current.zoom).toBe(0.73)
  })
})
