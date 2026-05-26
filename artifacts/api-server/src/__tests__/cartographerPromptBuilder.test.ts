import { describe, it, expect } from 'vitest'
import { buildSystemPrompt } from '../routes/cartographer'

const defaultContext = {
  nodes: [],
  activeTerrain: 'the-void' as const,
  activeRealms: [],
}

describe('buildSystemPrompt', () => {
  it('always identifies itself as The Cartographer', () => {
    const result = buildSystemPrompt('converse', 'default', defaultContext)
    expect(result).toContain('The Cartographer')
  })

  it('includes the active terrain name in the prompt', () => {
    const result = buildSystemPrompt('converse', 'default', {
      ...defaultContext,
      activeTerrain: 'memory-palace',
    })
    expect(result).toContain('memory-palace')
  })

  it('applies the chosen style guidance text', () => {
    // style keys are not included verbatim — the guidance prose is
    const academic = buildSystemPrompt('converse', 'academic', defaultContext)
    expect(academic.toLowerCase()).toContain('scholarly')

    const mythic = buildSystemPrompt('converse', 'mythic', defaultContext)
    expect(mythic.toLowerCase()).toContain('archetypal')
  })

  it('includes strict JSON instructions in extract mode', () => {
    const result = buildSystemPrompt('extract', 'default', defaultContext)
    expect(result).toContain('Return STRICT JSON')
    expect(result).toContain('variations')
  })

  it('includes strict JSON instructions in analyze mode', () => {
    const result = buildSystemPrompt('analyze', 'default', defaultContext)
    expect(result).toContain('Return STRICT JSON')
    expect(result).toContain('coreInsight')
  })

  it('includes strict JSON instructions in crystallize mode', () => {
    const result = buildSystemPrompt('crystallize', 'default', defaultContext)
    expect(result).toContain('Return STRICT JSON')
    expect(result).toContain('coreNodes')
    expect(result).toContain('tensions')
  })

  it('does not include JSON schema instructions in converse mode', () => {
    const result = buildSystemPrompt('converse', 'default', defaultContext)
    expect(result).not.toContain('Return STRICT JSON')
  })

  it('does not include JSON schema instructions in wander mode', () => {
    const result = buildSystemPrompt('wander', 'default', defaultContext)
    expect(result).not.toContain('Return STRICT JSON')
  })

  it('includes node count from context topology', () => {
    const result = buildSystemPrompt('converse', 'default', {
      ...defaultContext,
      nodes: [
        { id: 'n1', title: 'Alpha', type: 'thought', realms: [], x: 0, y: 0 },
        { id: 'n2', title: 'Beta', type: 'research', realms: [], x: 10, y: 10 },
      ],
    })
    expect(result).toContain('nodeCount: 2')
  })
})
