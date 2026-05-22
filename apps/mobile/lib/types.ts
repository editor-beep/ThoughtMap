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

export type TerrainId =
  | 'memory-palace'
  | 'interstellar-plane'
  | 'terrestrial-globe'
  | 'mythic-landscape'
  | 'the-void';

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

export interface MapExtractNode {
  id: string;
  title: string;
  content?: string;
  type: string;
  suggestedPosition?: { x: number; y: number };
  realm?: string;
  tags?: string[];
  visual?: string;
}

export interface MapExtractEdge {
  from: string;
  to: string;
  type: string;
  strength?: number;
  label?: string;
}

export interface MapExtract {
  nodes: MapExtractNode[];
  edges: MapExtractEdge[];
  suggestions?: {
    newRealms?: string[];
    clusters?: string[];
    actions?: string[];
  };
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  extractedNodeId?: string;
  mapExtract?: MapExtract;
}
