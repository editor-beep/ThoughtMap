import { beforeEach, describe, it, expect } from 'vitest'
import { useThoughtStore, MASTER_MAP_ID } from '../store'
import type { ThoughtNode } from '../types'

const getStore = () => useThoughtStore.getState()

const BLANK_MASTER_MAP = {
  id: MASTER_MAP_ID,
  title: 'Master Map',
  level: 'master' as const,
  parentMapId: null,
  parentNodeId: null,
  nodes: [] as ThoughtNode[],
  edges: [] as { id: string; source: string; target: string; type: string }[],
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
}

function makeNodeData(overrides: Partial<Omit<ThoughtNode, 'id' | 'createdAt'>> = {}): Omit<ThoughtNode, 'id' | 'createdAt'> {
  return {
    title: 'Test Node',
    content: '',
    type: 'thought',
    realms: [],
    x: 0,
    y: 0,
    ...overrides,
  }
}

beforeEach(() => {
  localStorage.clear()
  useThoughtStore.setState({
    maps: { [MASTER_MAP_ID]: BLANK_MASTER_MAP },
    currentMapId: MASTER_MAP_ID,
    nodes: [],
    edges: [],
    realms: [],
    undoStack: [],
    cartographerSuggestions: null,
    cartographerInsight: null,
    cartographerAppliedIndices: [],
    cartographerExtractingMessageId: null,
    importStatusMessage: null,
    selectedEdgeId: null,
    focusedNodeId: null,
  })
})

// ─── addNode ───────────────────────────────────────────────────────────────

describe('addNode', () => {
  it('appends a node to the canvas and returns its id', () => {
    const id = getStore().addNode(makeNodeData({ title: 'Alpha' }))
    const { nodes } = getStore()
    expect(nodes).toHaveLength(1)
    expect(nodes[0].id).toBe(id)
    expect(nodes[0].title).toBe('Alpha')
  })

  it('generates a node id with a node_ prefix', () => {
    const id = getStore().addNode(makeNodeData())
    expect(id).toMatch(/^node_/)
  })

  it('preserves valid x/y coordinates', () => {
    getStore().addNode(makeNodeData({ x: 123, y: 456 }))
    const node = getStore().nodes[0]
    expect(node.x).toBe(123)
    expect(node.y).toBe(456)
  })

  it('falls back to spawn position when coordinates are NaN', () => {
    getStore().addNode(makeNodeData({ x: NaN, y: NaN }))
    const node = getStore().nodes[0]
    expect(Number.isFinite(node.x)).toBe(true)
    expect(Number.isFinite(node.y)).toBe(true)
  })

  it('accumulates multiple nodes', () => {
    getStore().addNode(makeNodeData({ title: 'A' }))
    getStore().addNode(makeNodeData({ title: 'B' }))
    getStore().addNode(makeNodeData({ title: 'C' }))
    expect(getStore().nodes).toHaveLength(3)
  })
})

// ─── updateNode ────────────────────────────────────────────────────────────

describe('updateNode', () => {
  it('updates the title of an existing node', () => {
    const id = getStore().addNode(makeNodeData({ title: 'Old' }))
    getStore().updateNode(id, { title: 'New' })
    const node = getStore().nodes.find((n) => n.id === id)
    expect(node?.title).toBe('New')
  })

  it('does not affect other nodes', () => {
    const idA = getStore().addNode(makeNodeData({ title: 'A' }))
    const idB = getStore().addNode(makeNodeData({ title: 'B' }))
    getStore().updateNode(idA, { title: 'A Updated' })
    const nodeB = getStore().nodes.find((n) => n.id === idB)
    expect(nodeB?.title).toBe('B')
  })
})

// ─── deleteNode ────────────────────────────────────────────────────────────

describe('deleteNode', () => {
  it('removes the node from the canvas', () => {
    const id = getStore().addNode(makeNodeData())
    getStore().deleteNode(id)
    expect(getStore().nodes).toHaveLength(0)
  })

  it('also removes edges connected to the deleted node', () => {
    const aId = getStore().addNode(makeNodeData({ title: 'A' }))
    const bId = getStore().addNode(makeNodeData({ title: 'B' }))
    getStore().addEdge(aId, bId, 'references')
    getStore().deleteNode(aId)
    expect(getStore().edges).toHaveLength(0)
  })

  it('pushes the deleted node to the undo stack', () => {
    const id = getStore().addNode(makeNodeData())
    getStore().deleteNode(id)
    expect(getStore().undoStack).toHaveLength(1)
    expect(getStore().undoStack[0].type).toBe('deleteNode')
  })

  it('is a no-op for a non-existent id', () => {
    getStore().addNode(makeNodeData())
    getStore().deleteNode('non-existent')
    expect(getStore().nodes).toHaveLength(1)
    expect(getStore().undoStack).toHaveLength(0)
  })
})

// ─── addEdge / deleteEdge ──────────────────────────────────────────────────

describe('addEdge', () => {
  it('creates an edge between two nodes', () => {
    const aId = getStore().addNode(makeNodeData({ title: 'A' }))
    const bId = getStore().addNode(makeNodeData({ title: 'B' }))
    getStore().addEdge(aId, bId, 'supports')
    const { edges } = getStore()
    expect(edges).toHaveLength(1)
    expect(edges[0].source).toBe(aId)
    expect(edges[0].target).toBe(bId)
    expect(edges[0].type).toBe('supports')
  })

  it('generates an edge id with an edge_ prefix', () => {
    const aId = getStore().addNode(makeNodeData())
    const bId = getStore().addNode(makeNodeData())
    getStore().addEdge(aId, bId, 'references')
    expect(getStore().edges[0].id).toMatch(/^edge_/)
  })
})

describe('deleteEdge', () => {
  it('removes the edge from the canvas', () => {
    const aId = getStore().addNode(makeNodeData())
    const bId = getStore().addNode(makeNodeData())
    getStore().addEdge(aId, bId, 'references')
    const edgeId = getStore().edges[0].id
    getStore().deleteEdge(edgeId)
    expect(getStore().edges).toHaveLength(0)
  })

  it('pushes the deleted edge to the undo stack', () => {
    const aId = getStore().addNode(makeNodeData())
    const bId = getStore().addNode(makeNodeData())
    getStore().addEdge(aId, bId, 'references')
    const edgeId = getStore().edges[0].id
    getStore().deleteEdge(edgeId)
    expect(getStore().undoStack[0].type).toBe('deleteEdge')
  })
})

// ─── undo ──────────────────────────────────────────────────────────────────

describe('undo', () => {
  it('restores a deleted node', () => {
    const id = getStore().addNode(makeNodeData({ title: 'Revivable' }))
    getStore().deleteNode(id)
    expect(getStore().nodes).toHaveLength(0)
    getStore().undo()
    const restored = getStore().nodes.find((n) => n.id === id)
    expect(restored?.title).toBe('Revivable')
  })

  it('restores edges that were deleted with the node', () => {
    const aId = getStore().addNode(makeNodeData({ title: 'A' }))
    const bId = getStore().addNode(makeNodeData({ title: 'B' }))
    getStore().addEdge(aId, bId, 'contradicts')
    getStore().deleteNode(aId)
    expect(getStore().edges).toHaveLength(0)
    getStore().undo()
    expect(getStore().edges).toHaveLength(1)
  })

  it('restores a deleted edge', () => {
    const aId = getStore().addNode(makeNodeData())
    const bId = getStore().addNode(makeNodeData())
    getStore().addEdge(aId, bId, 'evolves_from')
    const edgeId = getStore().edges[0].id
    getStore().deleteEdge(edgeId)
    getStore().undo()
    const restored = getStore().edges.find((e) => e.id === edgeId)
    expect(restored).toBeDefined()
  })

  it('removes the action from the undo stack after restoring', () => {
    const id = getStore().addNode(makeNodeData())
    getStore().deleteNode(id)
    expect(getStore().undoStack).toHaveLength(1)
    getStore().undo()
    expect(getStore().undoStack).toHaveLength(0)
  })

  it('is a no-op when the undo stack is empty', () => {
    getStore().addNode(makeNodeData({ title: 'Safe' }))
    getStore().undo() // nothing to undo
    expect(getStore().nodes).toHaveLength(1)
  })
})

// ─── switchMap ─────────────────────────────────────────────────────────────

describe('switchMap', () => {
  it('serializes current map nodes into maps before switching', () => {
    getStore().addNode(makeNodeData({ title: 'Root' }))
    const newMapId = getStore().createMap('Child Map', MASTER_MAP_ID)
    getStore().switchMap(newMapId)
    const master = getStore().maps[MASTER_MAP_ID]
    expect(master.nodes).toHaveLength(1)
    expect(master.nodes[0].title).toBe('Root')
  })

  it('loads the target map nodes after switching', () => {
    const newMapId = getStore().createMap('Child Map', MASTER_MAP_ID)
    const seedNode: ThoughtNode = {
      id: 'seed-1',
      title: 'Seeded',
      content: '',
      type: 'thought',
      realms: [],
      x: 0,
      y: 0,
      createdAt: '2024-01-01T00:00:00.000Z',
    }
    useThoughtStore.setState((s) => ({
      maps: { ...s.maps, [newMapId]: { ...s.maps[newMapId], nodes: [seedNode] } },
    }))
    getStore().switchMap(newMapId)
    expect(getStore().nodes).toHaveLength(1)
    expect(getStore().nodes[0].title).toBe('Seeded')
    expect(getStore().currentMapId).toBe(newMapId)
  })

  it('is a no-op when switching to the current map', () => {
    getStore().addNode(makeNodeData({ title: 'Stays' }))
    getStore().switchMap(MASTER_MAP_ID) // already on master
    expect(getStore().nodes).toHaveLength(1)
  })

  it('ignores a switch to a non-existent map id', () => {
    getStore().addNode(makeNodeData())
    getStore().switchMap('does-not-exist')
    expect(getStore().currentMapId).toBe(MASTER_MAP_ID)
  })
})

// ─── splitNodeIntoNewMap ───────────────────────────────────────────────────

describe('splitNodeIntoNewMap', () => {
  it('creates a new child map seeded with the source node', () => {
    const nodeId = getStore().addNode(makeNodeData({ title: 'Source' }))
    const newMapId = getStore().splitNodeIntoNewMap(nodeId)
    expect(newMapId).toMatch(/^map_/)
    const newMap = getStore().maps[newMapId!]
    expect(newMap.nodes).toHaveLength(1)
    expect(newMap.nodes[0].title).toBe('Source')
  })

  it('links the new map back to the current map as its parent', () => {
    const nodeId = getStore().addNode(makeNodeData())
    const newMapId = getStore().splitNodeIntoNewMap(nodeId)
    expect(getStore().maps[newMapId!].parentMapId).toBe(MASTER_MAP_ID)
  })

  it('marks the source node as a semantic field with childMapId', () => {
    const nodeId = getStore().addNode(makeNodeData())
    const newMapId = getStore().splitNodeIntoNewMap(nodeId)
    const source = getStore().nodes.find((n) => n.id === nodeId)
    expect(source?.childMapId).toBe(newMapId)
    expect(source?.isSemanticField).toBe(true)
  })

  it('returns null for a non-existent node id', () => {
    expect(getStore().splitNodeIntoNewMap('ghost')).toBeNull()
  })

  it('includes connected neighbor nodes when includeNeighbors is true', () => {
    const sourceId = getStore().addNode(makeNodeData({ title: 'Source' }))
    const neighborId = getStore().addNode(makeNodeData({ title: 'Neighbor' }))
    getStore().addEdge(sourceId, neighborId, 'references')
    const newMapId = getStore().splitNodeIntoNewMap(sourceId, true)
    const newMap = getStore().maps[newMapId!]
    expect(newMap.nodes).toHaveLength(2)
    expect(newMap.edges).toHaveLength(1)
  })
})

// ─── addRealm ──────────────────────────────────────────────────────────────

describe('addRealm', () => {
  it('creates a realm with an id derived from the name', () => {
    const id = getStore().addRealm('My Realm')
    expect(id).toBe('my-realm')
    const realm = getStore().realms.find((r) => r.id === id)
    expect(realm?.name).toBe('My Realm')
    expect(realm?.isActive).toBe(true)
  })

  it('returns the existing id when a duplicate name is added', () => {
    const id1 = getStore().addRealm('Science')
    const id2 = getStore().addRealm('Science')
    expect(id1).toBe(id2)
    expect(getStore().realms.filter((r) => r.id === 'science')).toHaveLength(1)
  })

  it('generates a timestamp-based id when the name normalizes to empty', () => {
    const id = getStore().addRealm('   ')
    expect(id).toMatch(/^realm-\d+/)
  })

  it('strips special characters when generating the id', () => {
    const id = getStore().addRealm('Hello, World!')
    expect(id).toBe('hello-world')
  })
})

// ─── importMap ─────────────────────────────────────────────────────────────

describe('importMap', () => {
  it('stages imported nodes as cartographerSuggestions', () => {
    getStore().importMap({
      nodes: [{ id: 'n1', title: 'Imported', content: 'Body', type: 'research', realms: [], x: 0, y: 0, createdAt: '2024-01-01' }],
      edges: [],
      realms: [],
    })
    const state = getStore()
    expect(state.cartographerSuggestions).toHaveLength(1)
    expect(state.cartographerSuggestions![0].title).toBe('Imported')
    expect(state.importStatusMessage).toContain('1 concepts imported')
  })

  it('sets an error message for an unsupported format', () => {
    getStore().importMap('this is a plain string')
    expect(getStore().importStatusMessage).toBe('Unsupported import format')
  })

  it('deduplicates nodes that already exist in the store', () => {
    const existingId = getStore().addNode(makeNodeData({ title: 'Existing' }))
    const actualId = getStore().nodes[0].id
    getStore().importMap({
      nodes: [
        { id: actualId, title: 'Existing', content: '', type: 'thought', realms: [], x: 0, y: 0, createdAt: '2024-01-01' },
        { id: 'fresh-id', title: 'New', content: '', type: 'thought', realms: [], x: 10, y: 10, createdAt: '2024-01-01' },
      ],
      edges: [],
      realms: [],
    })
    expect(getStore().cartographerSuggestions).toHaveLength(1)
    expect(getStore().cartographerSuggestions![0].title).toBe('New')
    void existingId
  })

  it('normalizes unknown node types to thought', () => {
    getStore().importMap({
      nodes: [{ id: 'x1', title: 'Mystery', content: '', type: 'unknown-type', realms: [], x: 0, y: 0, createdAt: '2024-01-01' }],
      edges: [],
      realms: [],
    })
    const suggestion = getStore().cartographerSuggestions![0]
    expect(suggestion.type).toBe('thought')
  })
})
