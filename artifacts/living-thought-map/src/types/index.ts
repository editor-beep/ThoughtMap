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
