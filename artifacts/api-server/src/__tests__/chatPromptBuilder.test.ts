import { describe, it, expect } from 'vitest'
import { buildSystemInstruction } from '../routes/chat'

describe('buildSystemInstruction', () => {
  it('returns the base system prompt when no context is provided', () => {
    const result = buildSystemInstruction()
    expect(result).toContain('ThoughtMap')
    expect(result).toContain('LINK:')
  })

  it('includes active terrain in the output', () => {
    const result = buildSystemInstruction([], 'deep-ocean')
    expect(result).toContain('Active terrain: deep-ocean')
  })

  it('includes the focused node id when provided', () => {
    const result = buildSystemInstruction([], undefined, 'node-abc-123')
    expect(result).toContain('node-abc-123')
  })

  it('lists context nodes with their metadata', () => {
    const nodes = [
      { id: 'n1', title: 'The Abyss', type: 'myth', realm: 'horror' },
      { id: 'n2', title: 'Recursion', type: 'research' },
    ]
    const result = buildSystemInstruction(nodes)
    expect(result).toContain('"The Abyss"')
    expect(result).toContain('type: myth')
    expect(result).toContain('realm: horror')
    expect(result).toContain('"Recursion"')
    // n2 has no realm — its entry should not include a realm segment
    expect(result).not.toMatch(/id: n2[^\n]*realm:/)
  })

  it('includes voice style guidance', () => {
    const mythic = buildSystemInstruction([], undefined, undefined, 'mythic')
    expect(mythic).toContain('mythic')

    const academic = buildSystemInstruction([], undefined, undefined, 'academic')
    expect(academic).toContain('academic')
  })

  it('always includes a Canvas Context section (voice style is always appended)', () => {
    // The function unconditionally adds a voice style line, so the section is always present
    const result = buildSystemInstruction()
    expect(result).toContain('## Current Canvas Context')
    expect(result).toContain('Voice style: default')
  })

  it('includes the specified voice style in the context section', () => {
    const result = buildSystemInstruction([], 'the-void', undefined, 'mythic')
    expect(result).toContain('## Current Canvas Context')
    expect(result).toContain('Voice style: mythic')
  })
})
