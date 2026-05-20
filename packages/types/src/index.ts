export type NodeType =
  | 'thought'
  | 'joke'
  | 'character'
  | 'myth'
  | 'research'
  | 'canon'
  | 'contradiction'
  | 'artifact'
  | 'fragment';

export type EdgeType =
  | 'evolves_from'
  | 'contradicts'
  | 'references'
  | 'remixes'
  | 'supports';

export interface ThoughtNode {
  id: string;
  title: string;
  content: string;
  type: NodeType;
  realms: string[];
  x: number;
  y: number;
  createdAt: string;
}

export interface ThoughtEdge {
  id: string;
  source: string;
  target: string;
  type: EdgeType;
}

export interface Realm {
  id: string;
  name: string;
  symbol: string;
  color: string;
  isActive: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  extractedNodeId?: string;
}

export type TerrainId =
  | 'memory-palace'
  | 'interstellar-plane'
  | 'terrestrial-globe'
  | 'mythic-landscape'
  | 'the-void';

// Cartographer Agent Types
export type CartographerMode = 'extract' | 'converse' | 'wander';

export interface CartographerVariation {
  title: string;
  content: string;
  type: NodeType;
  realms: string[];
  suggestedZone: string;
  reasoning: string;
}

export interface CartographerResponse {
  variations?: CartographerVariation[];
  spatialInsight?: string;
  message?: string;
  wanderReflection?: string;
}

export interface CartographerContext {
  nodes: Array<{
    id: string;
    title: string;
    type: NodeType;
    realms: string[];
    x: number;
    y: number;
  }>;
  activeTerrain: TerrainId;
  activeRealms: string[];
}
