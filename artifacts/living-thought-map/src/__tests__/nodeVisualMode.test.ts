import { describe, it, expect } from 'vitest'
import { getNodeVisualMode, isFinitePosition, NODE_VISUAL_MODE_THRESHOLDS } from '../lib/nodeVisualMode'
import { NodeVisualMode } from '../types/nodeVisualMode'

describe('getNodeVisualMode', () => {
  it('returns FULL_CARD at the FULL_CARD threshold', () => {
    expect(getNodeVisualMode(NODE_VISUAL_MODE_THRESHOLDS.FULL_CARD)).toBe(NodeVisualMode.FULL_CARD)
  })

  it('returns FULL_CARD above the FULL_CARD threshold', () => {
    expect(getNodeVisualMode(1.5)).toBe(NodeVisualMode.FULL_CARD)
    expect(getNodeVisualMode(10)).toBe(NodeVisualMode.FULL_CARD)
  })

  it('returns COMPACT_CARD at the COMPACT_CARD threshold', () => {
    expect(getNodeVisualMode(NODE_VISUAL_MODE_THRESHOLDS.COMPACT_CARD)).toBe(NodeVisualMode.COMPACT_CARD)
  })

  it('returns COMPACT_CARD between COMPACT_CARD and FULL_CARD thresholds', () => {
    expect(getNodeVisualMode(0.7)).toBe(NodeVisualMode.COMPACT_CARD)
    expect(getNodeVisualMode(0.89)).toBe(NodeVisualMode.COMPACT_CARD)
  })

  it('returns DOT just below the COMPACT_CARD threshold', () => {
    expect(getNodeVisualMode(0.54)).toBe(NodeVisualMode.DOT)
  })

  it('returns DOT at zero zoom', () => {
    expect(getNodeVisualMode(0)).toBe(NodeVisualMode.DOT)
  })

  it('returns DOT at negative zoom', () => {
    expect(getNodeVisualMode(-1)).toBe(NodeVisualMode.DOT)
  })
})

describe('isFinitePosition', () => {
  it('returns true for valid coordinates', () => {
    expect(isFinitePosition(0, 0)).toBe(true)
    expect(isFinitePosition(100, -200)).toBe(true)
    expect(isFinitePosition(-999, 999)).toBe(true)
  })

  it('returns false when x is NaN', () => {
    expect(isFinitePosition(NaN, 0)).toBe(false)
  })

  it('returns false when x is Infinity', () => {
    expect(isFinitePosition(Infinity, 0)).toBe(false)
    expect(isFinitePosition(-Infinity, 0)).toBe(false)
  })

  it('returns false when y is NaN', () => {
    expect(isFinitePosition(0, NaN)).toBe(false)
  })

  it('returns false when y is Infinity', () => {
    expect(isFinitePosition(0, Infinity)).toBe(false)
    expect(isFinitePosition(0, -Infinity)).toBe(false)
  })

  it('returns false when both are non-finite', () => {
    expect(isFinitePosition(NaN, Infinity)).toBe(false)
  })
})
