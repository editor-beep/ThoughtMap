import { describe, it, expect } from 'vitest'
import { detectImportType, normalizeImport, adaptVaultMindToThoughtMap } from '../lib/importAdapters'

describe('detectImportType', () => {
  it('detects thoughtmap format when nodes and edges are present', () => {
    expect(detectImportType({ nodes: [], edges: [] })).toBe('thoughtmap')
  })

  it('detects vaultmind format when artifacts is present', () => {
    expect(detectImportType({ artifacts: [] })).toBe('vaultmind')
  })

  it('detects vaultmind format when concepts is present', () => {
    expect(detectImportType({ concepts: [] })).toBe('vaultmind')
  })

  it('detects vaultmind format when relationships is present', () => {
    expect(detectImportType({ relationships: [] })).toBe('vaultmind')
  })

  it('returns unknown for an empty object', () => {
    expect(detectImportType({})).toBe('unknown')
  })

  it('returns unknown for null', () => {
    expect(detectImportType(null)).toBe('unknown')
  })

  it('returns unknown for a plain number', () => {
    expect(detectImportType(42)).toBe('unknown')
  })
})

describe('normalizeImport', () => {
  it('normalizes artifacts with explicit fields', () => {
    const data = {
      artifacts: [{ id: 'a1', name: 'Concept', summary: 'About something', type: 'research', tags: ['x'] }],
      relationships: [{ id: 'r1', sourceId: 'a1', targetId: 'a2', type: 'related' }],
    }
    const result = normalizeImport(data)
    expect(result.nodes).toHaveLength(1)
    expect(result.nodes[0]).toMatchObject({ id: 'a1', title: 'Concept', body: 'About something', type: 'research', tags: ['x'] })
    expect(result.edges).toHaveLength(1)
    expect(result.edges[0]).toMatchObject({ source: 'a1', target: 'a2', type: 'related' })
  })

  it('reads concepts when artifacts is absent', () => {
    const data = {
      concepts: [{ id: 'c1', name: 'Idea' }],
      relationships: [],
    }
    const result = normalizeImport(data)
    expect(result.nodes[0]).toMatchObject({ id: 'c1', title: 'Idea' })
  })

  it('reads edges via the edges field when relationships is absent', () => {
    const data = {
      artifacts: [{ id: 'n1', name: 'X' }],
      edges: [{ id: 'e1', source: 'n1', target: 'n2', type: 'references' }],
    }
    const result = normalizeImport(data)
    expect(result.edges[0]).toMatchObject({ id: 'e1', source: 'n1', target: 'n2', type: 'references' })
  })

  it('falls back to label for title when name is absent', () => {
    const data = { artifacts: [{ id: 'a1', label: 'LabelTitle' }], relationships: [] }
    const result = normalizeImport(data)
    expect(result.nodes[0].title).toBe('LabelTitle')
  })

  it('falls back to description for body when summary is absent', () => {
    const data = { artifacts: [{ id: 'a1', name: 'X', description: 'Desc' }], relationships: [] }
    const result = normalizeImport(data)
    expect(result.nodes[0].body).toBe('Desc')
  })

  it('generates a default title "Artifact N" when all name fields are absent', () => {
    const data = { artifacts: [{}], relationships: [] }
    const result = normalizeImport(data)
    expect(result.nodes[0].title).toBe('Artifact 1')
    expect(result.nodes[0].body).toBe('')
    expect(result.nodes[0].type).toBe('thought')
    expect(result.nodes[0].tags).toEqual([])
  })

  it('generates a UUID when id is missing', () => {
    const data = { artifacts: [{ name: 'X' }], relationships: [] }
    const result = normalizeImport(data)
    expect(typeof result.nodes[0].id).toBe('string')
    expect(result.nodes[0].id.length).toBeGreaterThan(0)
  })

  it('filters out edges that are missing source', () => {
    const data = {
      nodes: [],
      edges: [{ id: 'e1', target: 'n2' }],
    }
    const result = normalizeImport(data)
    expect(result.edges).toHaveLength(0)
  })

  it('filters out edges that are missing target', () => {
    const data = {
      nodes: [],
      edges: [{ id: 'e1', source: 'n1' }],
    }
    const result = normalizeImport(data)
    expect(result.edges).toHaveLength(0)
  })

  it('keeps valid edges and drops invalid ones in a mixed list', () => {
    const data = {
      nodes: [],
      edges: [
        { id: 'e1', source: 'n1', target: 'n2' },
        { id: 'e2', source: undefined, target: 'n2' },
        { id: 'e3', source: 'n1', target: undefined },
      ],
    }
    const result = normalizeImport(data)
    expect(result.edges).toHaveLength(1)
    expect(result.edges[0].id).toBe('e1')
  })

  it('treats non-array tags as empty array', () => {
    const data = { artifacts: [{ id: 'a1', name: 'X', tags: 'not-an-array' }], relationships: [] }
    const result = normalizeImport(data)
    expect(result.nodes[0].tags).toEqual([])
  })
})

describe('adaptVaultMindToThoughtMap', () => {
  it('produces spiral x/y positions using cos/sin * 400', () => {
    const data = {
      artifacts: [{ id: 'a1', name: 'First' }, { id: 'a2', name: 'Second' }],
      relationships: [],
    }
    const result = adaptVaultMindToThoughtMap(data)
    expect(result.nodes[0].x).toBeCloseTo(Math.cos(0) * 400)
    expect(result.nodes[0].y).toBeCloseTo(Math.sin(0) * 400)
    expect(result.nodes[1].x).toBeCloseTo(Math.cos(0.5) * 400)
    expect(result.nodes[1].y).toBeCloseTo(Math.sin(0.5) * 400)
  })

  it('returns empty realms at the top level and per node', () => {
    const data = { artifacts: [{ id: 'n1', name: 'X' }], relationships: [] }
    const result = adaptVaultMindToThoughtMap(data)
    expect(result.realms).toEqual([])
    expect(result.nodes[0].realms).toEqual([])
  })

  it('maps node fields correctly', () => {
    const data = {
      artifacts: [{ id: 'a1', name: 'My Node', summary: 'Details here', type: 'research' }],
      relationships: [],
    }
    const result = adaptVaultMindToThoughtMap(data)
    expect(result.nodes[0]).toMatchObject({
      id: 'a1',
      title: 'My Node',
      content: 'Details here',
      type: 'research',
    })
  })

  it('returns edges from relationships', () => {
    const data = {
      artifacts: [{ id: 'a1', name: 'A' }, { id: 'a2', name: 'B' }],
      relationships: [{ id: 'r1', sourceId: 'a1', targetId: 'a2' }],
    }
    const result = adaptVaultMindToThoughtMap(data)
    expect(result.edges).toHaveLength(1)
    expect(result.edges[0]).toMatchObject({ source: 'a1', target: 'a2' })
  })
})
