import { describe, it, expect } from 'vitest'
import { computeClusters } from '../lib/clustering'
import type { ThoughtNode } from '../types'

function makeNode(overrides: Partial<ThoughtNode> & { x: number; y: number; id: string }): ThoughtNode {
  return {
    title: 'Test',
    content: '',
    type: 'thought',
    realms: [],
    createdAt: new Date().toISOString(),
    ...overrides,
  }
}

describe('computeClusters', () => {
  it('returns empty array for no nodes', () => {
    expect(computeClusters([], 1)).toEqual([])
  })

  it('puts a single node in its own cluster', () => {
    const node = makeNode({ id: 'n1', x: 100, y: 200 })
    const clusters = computeClusters([node], 1)
    expect(clusters).toHaveLength(1)
    expect(clusters[0].x).toBe(100)
    expect(clusters[0].y).toBe(200)
    expect(clusters[0].nodes).toEqual([node])
  })

  it('groups nearby nodes into one cluster at zoom=1', () => {
    // gridSize = 220/1 = 220; both nodes fall in cell (0, 0)
    const n1 = makeNode({ id: 'n1', x: 10, y: 10 })
    const n2 = makeNode({ id: 'n2', x: 50, y: 50 })
    const clusters = computeClusters([n1, n2], 1)
    expect(clusters).toHaveLength(1)
    expect(clusters[0].nodes).toHaveLength(2)
    expect(clusters[0].x).toBe(30) // avg of 10 and 50
    expect(clusters[0].y).toBe(30)
  })

  it('separates nodes that fall in different grid cells', () => {
    // gridSize = 220; n1 in cell (0,0), n2 in cell (1,1)
    const n1 = makeNode({ id: 'n1', x: 10, y: 10 })
    const n2 = makeNode({ id: 'n2', x: 300, y: 300 })
    const clusters = computeClusters([n1, n2], 1)
    expect(clusters).toHaveLength(2)
  })

  it('merges nodes across a wider area when zoomed out', () => {
    // At zoom=0.1, gridSize = 220/0.1 = 2200; nodes 500 apart still cluster
    const n1 = makeNode({ id: 'n1', x: 0, y: 0 })
    const n2 = makeNode({ id: 'n2', x: 500, y: 500 })
    const clusters = computeClusters([n1, n2], 0.1)
    expect(clusters).toHaveLength(1)
  })

  it('separates nodes when zoomed in enough', () => {
    // At zoom=2, gridSize = 220/2 = 110; nodes 200 apart split into separate cells
    const n1 = makeNode({ id: 'n1', x: 0, y: 0 })
    const n2 = makeNode({ id: 'n2', x: 200, y: 0 })
    const clusters = computeClusters([n1, n2], 2)
    expect(clusters).toHaveLength(2)
  })

  it('picks the most common type as dominantType', () => {
    const nodes = [
      makeNode({ id: 'n1', x: 0, y: 0, type: 'thought' }),
      makeNode({ id: 'n2', x: 10, y: 10, type: 'thought' }),
      makeNode({ id: 'n3', x: 20, y: 20, type: 'myth' }),
    ]
    const clusters = computeClusters(nodes, 1)
    expect(clusters[0].dominantType).toBe('thought')
  })

  it('does not throw when zoom is 0 (uses minimum floor)', () => {
    const node = makeNode({ id: 'n1', x: 0, y: 0 })
    expect(() => computeClusters([node], 0)).not.toThrow()
  })

  it('assigns a cluster id prefixed with "cluster-"', () => {
    const node = makeNode({ id: 'n1', x: 0, y: 0 })
    const clusters = computeClusters([node], 1)
    expect(clusters[0].id).toMatch(/^cluster-/)
  })

  it('calculates centroid correctly for three nodes', () => {
    const nodes = [
      makeNode({ id: 'n1', x: 0, y: 0 }),
      makeNode({ id: 'n2', x: 30, y: 60 }),
      makeNode({ id: 'n3', x: 60, y: 120 }),
    ]
    const clusters = computeClusters(nodes, 1)
    expect(clusters).toHaveLength(1)
    expect(clusters[0].x).toBe(30)
    expect(clusters[0].y).toBe(60)
  })
})
