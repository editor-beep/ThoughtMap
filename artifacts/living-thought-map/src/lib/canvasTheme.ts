import type { EdgeType } from '../types';

/** Stroke colors for each edge type, used by both the canvas and the minimap. */
export const EDGE_COLORS: Record<EdgeType, string> = {
  evolves_from: '#06b6d4',
  contradicts:  '#f43f5e',
  references:   '#3b82f6',
  remixes:      '#a855f7',
  supports:     '#10b981'
};

/** Human-readable labels for each edge type. */
export const EDGE_LABELS: Record<EdgeType, string> = {
  evolves_from: 'evolves from',
  contradicts:  'contradicts',
  references:   'references',
  remixes:      'remixes',
  supports:     'supports'
};

/** Dot colors keyed by node type. Falls back to slate when a type is unknown. */
export const NODE_TYPE_COLORS: Record<string, string> = {
  thought:      '#06b6d4',
  joke:         '#f59e0b',
  character:    '#a855f7',
  myth:         '#a855f7',
  research:     '#3b82f6',
  canon:        '#10b981',
  contradiction:'#f43f5e',
  artifact:     '#64748b',
  fragment:     '#475569'
};
