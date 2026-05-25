import { describe, it, expect } from 'vitest'
import { normalizePointerEvent } from '../lib/input/normalizePointerEvent'

describe('normalizePointerEvent', () => {
  it('passes through valid numeric coordinates unchanged', () => {
    const result = normalizePointerEvent({ clientX: 100, clientY: 200, pointerType: 'mouse' })
    expect(result.clientX).toBe(100)
    expect(result.clientY).toBe(200)
    expect(result.pointerType).toBe('mouse')
  })

  it('clamps NaN clientX to 0', () => {
    const result = normalizePointerEvent({ clientX: NaN, clientY: 100, pointerType: 'mouse' })
    expect(result.clientX).toBe(0)
    expect(result.clientY).toBe(100)
  })

  it('clamps Infinity clientX to 0', () => {
    const result = normalizePointerEvent({ clientX: Infinity, clientY: 50 })
    expect(result.clientX).toBe(0)
  })

  it('clamps -Infinity clientY to 0', () => {
    const result = normalizePointerEvent({ clientX: 50, clientY: -Infinity })
    expect(result.clientY).toBe(0)
  })

  it('clamps non-numeric clientX (string) to 0', () => {
    const result = normalizePointerEvent({ clientX: 'oops' as unknown as number, clientY: 0 })
    expect(result.clientX).toBe(0)
  })

  it('defaults pointerType to "unknown" when not a string', () => {
    const result = normalizePointerEvent({ clientX: 0, clientY: 0, pointerType: 42 as unknown as string })
    expect(result.pointerType).toBe('unknown')
  })

  it('defaults all fields when event is empty', () => {
    const result = normalizePointerEvent({})
    expect(result.clientX).toBe(0)
    expect(result.clientY).toBe(0)
    expect(result.pointerType).toBe('unknown')
  })

  it('preserves negative (valid) coordinates', () => {
    const result = normalizePointerEvent({ clientX: -50, clientY: -150, pointerType: 'touch' })
    expect(result.clientX).toBe(-50)
    expect(result.clientY).toBe(-150)
    expect(result.pointerType).toBe('touch')
  })

  it('handles pen pointerType', () => {
    const result = normalizePointerEvent({ clientX: 300, clientY: 400, pointerType: 'pen' })
    expect(result.pointerType).toBe('pen')
  })
})
