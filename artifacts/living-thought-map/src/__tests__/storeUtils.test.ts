import { describe, it, expect } from 'vitest'
import {
  isFiniteCoordinate,
  cleanForExtraction,
  clampWorld,
  MAX_WORLD_COORD,
  generateSpawnPosition,
  normalizeNodePosition,
} from '../lib/storeUtils'

describe('isFiniteCoordinate', () => {
  it('accepts a normal positive integer', () => {
    expect(isFiniteCoordinate(100)).toBe(true)
  })

  it('accepts zero', () => {
    expect(isFiniteCoordinate(0)).toBe(true)
  })

  it('accepts a negative float', () => {
    expect(isFiniteCoordinate(-3.14)).toBe(true)
  })

  it('rejects NaN', () => {
    expect(isFiniteCoordinate(NaN)).toBe(false)
  })

  it('rejects positive Infinity', () => {
    expect(isFiniteCoordinate(Infinity)).toBe(false)
  })

  it('rejects negative Infinity', () => {
    expect(isFiniteCoordinate(-Infinity)).toBe(false)
  })
})

describe('clampWorld', () => {
  it('passes through a value inside the range', () => {
    expect(clampWorld(0)).toBe(0)
    expect(clampWorld(1000)).toBe(1000)
    expect(clampWorld(-1000)).toBe(-1000)
  })

  it('clamps a value above the max to MAX_WORLD_COORD', () => {
    expect(clampWorld(MAX_WORLD_COORD + 1)).toBe(MAX_WORLD_COORD)
    expect(clampWorld(999_999)).toBe(MAX_WORLD_COORD)
  })

  it('clamps a value below the min to -MAX_WORLD_COORD', () => {
    expect(clampWorld(-MAX_WORLD_COORD - 1)).toBe(-MAX_WORLD_COORD)
    expect(clampWorld(-999_999)).toBe(-MAX_WORLD_COORD)
  })

  it('passes through the exact boundary values', () => {
    expect(clampWorld(MAX_WORLD_COORD)).toBe(MAX_WORLD_COORD)
    expect(clampWorld(-MAX_WORLD_COORD)).toBe(-MAX_WORLD_COORD)
  })
})

describe('cleanForExtraction', () => {
  it('returns content unchanged when no sentinel marker is present', () => {
    expect(cleanForExtraction('just plain text')).toBe('just plain text')
  })

  it('strips everything from the **MAP EXTRACT** marker onward', () => {
    const result = cleanForExtraction('useful content **MAP EXTRACT** junk after')
    expect(result).toBe('useful content')
  })

  it('strips everything from a ```json fence onward', () => {
    const result = cleanForExtraction('useful content ```json {"key": "value"}')
    expect(result).toBe('useful content')
  })

  it('trims surrounding whitespace from the result', () => {
    expect(cleanForExtraction('  text  ')).toBe('text')
  })

  it('uses the earliest marker when multiple are present', () => {
    const result = cleanForExtraction('keep **MAP EXTRACT** middle ```json end')
    expect(result).toBe('keep')
  })

  it('returns an empty string when marker is at position 0', () => {
    expect(cleanForExtraction('**MAP EXTRACT** everything')).toBe('')
  })
})

describe('generateSpawnPosition', () => {
  it('returns the origin for an empty canvas', () => {
    expect(generateSpawnPosition([])).toEqual({ x: 0, y: 0 })
  })

  it('generates a non-zero offset from a single node at the origin', () => {
    const { x, y } = generateSpawnPosition([{ x: 0, y: 0 }])
    expect(Math.abs(x) + Math.abs(y)).toBeGreaterThan(0)
  })

  it('orbits near the centroid of existing nodes', () => {
    // centroid is at (0, 0); spawn should be within spiral radius
    const nodes = [{ x: 100, y: 0 }, { x: -100, y: 0 }]
    const { x, y } = generateSpawnPosition(nodes)
    const dist = Math.sqrt(x * x + y * y)
    expect(dist).toBeGreaterThan(100)
    expect(dist).toBeLessThan(600)
  })

  it('always produces finite coordinates', () => {
    const nodes = Array.from({ length: 12 }, (_, i) => ({ x: i * 50, y: i * 30 }))
    const { x, y } = generateSpawnPosition(nodes)
    expect(Number.isFinite(x)).toBe(true)
    expect(Number.isFinite(y)).toBe(true)
  })
})

describe('normalizeNodePosition', () => {
  it('passes through valid coordinates unchanged (no overlap)', () => {
    const result = normalizeNodePosition({ x: 100, y: 200 }, [])
    expect(result.x).toBe(100)
    expect(result.y).toBe(200)
  })

  it('replaces a NaN x with the spawn fallback, preserving valid y', () => {
    const result = normalizeNodePosition({ x: NaN, y: 100 }, [])
    expect(result.x).toBe(0) // origin fallback on empty canvas
    expect(result.y).toBe(100)
  })

  it('replaces an Infinity y with the spawn fallback, preserving valid x', () => {
    const result = normalizeNodePosition({ x: 50, y: Infinity }, [])
    expect(result.x).toBe(50)
    expect(result.y).toBe(0) // origin fallback on empty canvas
  })

  it('clamps x beyond the world boundary', () => {
    const result = normalizeNodePosition({ x: 99_999, y: 0 }, [])
    expect(result.x).toBe(MAX_WORLD_COORD)
  })

  it('clamps negative y beyond the world boundary', () => {
    const result = normalizeNodePosition({ x: 0, y: -99_999 }, [])
    expect(result.y).toBe(-MAX_WORLD_COORD)
  })

  it('applies jitter when placed directly on an existing node', () => {
    const existing = [{ x: 50, y: 50 }]
    const result = normalizeNodePosition({ x: 50, y: 50 }, existing)
    // Must not land exactly on the existing node
    const dx = Math.abs(result.x - 50)
    const dy = Math.abs(result.y - 50)
    expect(dx + dy).toBeGreaterThan(0)
  })

  it('returns finite coordinates even after jitter', () => {
    const existing = [{ x: 0, y: 0 }]
    const { x, y } = normalizeNodePosition({ x: 0, y: 0 }, existing)
    expect(Number.isFinite(x)).toBe(true)
    expect(Number.isFinite(y)).toBe(true)
  })
})
