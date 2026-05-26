import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRateLimiter } from '../lib/rateLimiter'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('createRateLimiter', () => {
  it('allows the first request from a new IP', () => {
    const isRateLimited = createRateLimiter(3, 60_000)
    expect(isRateLimited('1.2.3.4')).toBe(false)
  })

  it('allows requests up to the max within the window', () => {
    const isRateLimited = createRateLimiter(3, 60_000)
    expect(isRateLimited('1.2.3.4')).toBe(false) // 1
    expect(isRateLimited('1.2.3.4')).toBe(false) // 2
    expect(isRateLimited('1.2.3.4')).toBe(false) // 3
  })

  it('blocks the request that exceeds the max', () => {
    const isRateLimited = createRateLimiter(3, 60_000)
    isRateLimited('1.2.3.4') // 1
    isRateLimited('1.2.3.4') // 2
    isRateLimited('1.2.3.4') // 3
    expect(isRateLimited('1.2.3.4')).toBe(true) // 4 — over limit
  })

  it('tracks different IPs independently', () => {
    const isRateLimited = createRateLimiter(1, 60_000)
    expect(isRateLimited('10.0.0.1')).toBe(false)
    expect(isRateLimited('10.0.0.2')).toBe(false) // fresh IP, not limited
    expect(isRateLimited('10.0.0.1')).toBe(true)  // already at limit
  })

  it('resets the counter after the window expires', () => {
    const isRateLimited = createRateLimiter(2, 60_000)
    isRateLimited('5.5.5.5') // 1
    isRateLimited('5.5.5.5') // 2
    expect(isRateLimited('5.5.5.5')).toBe(true) // over limit

    vi.advanceTimersByTime(60_001) // window expires

    expect(isRateLimited('5.5.5.5')).toBe(false) // fresh window
  })

  it('does not share state between separate limiter instances', () => {
    const limiterA = createRateLimiter(1, 60_000)
    const limiterB = createRateLimiter(1, 60_000)
    limiterA('9.9.9.9')
    expect(limiterA('9.9.9.9')).toBe(true)  // A is at limit
    expect(limiterB('9.9.9.9')).toBe(false) // B has its own state
  })
})
