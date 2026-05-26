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

export interface Attachment {
  id: string;
  type: 'image' | 'url' | 'file';
  url: string;
  name: string;
  mimeType?: string;
}

export interface NodeComment {
  id: string;
  spanStart: number;
  spanEnd: number;
  text: string;
  createdAt: string;
}

export interface ThoughtNode {
  id: string;
  title: string;
  content: string;
  type: NodeType;
  realms: string[];
  x: number;
  y: number;
  createdAt: string;
  tags?: string[];
  attachments?: Attachment[];
  comments?: NodeComment[];
  isAnchor?: boolean;
  isSemanticField?: boolean;
  subMapId?: string | null;
  childMapId?: string | null;
  importance?: number;
}

export interface ThoughtEdge {
  id: string;
  source: string;
  target: string;
  type: EdgeType;
}

export type MapLevel = 'master' | 'detail';

export interface MapDocument {
  id: string;
  title: string;
  level: MapLevel;
  parentMapId: string | null;
  parentNodeId: string | null;
  sourceNodeId?: string | null;
  nodes: ThoughtNode[];
  edges: ThoughtEdge[];
  createdAt: string;
  updatedAt: string;
  viewport?: { x: number; y: number; zoom: number };
  metadata?: {
    description?: string;
    icon?: string;
    color?: string;
    [key: string]: unknown;
  };
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
  /** false while streaming; true once the full response has arrived */
  complete?: boolean;
}

export type TerrainId = 'blackspace';

export type CartographerMode = 'extract' | 'converse' | 'wander' | 'analyze' | 'crystallize';
export type CartographerStyle = 'default' | 'mythic' | 'academic' | 'systems' | 'ritual' | 'void';

export interface CartographerVariation {
  title: string;
  content: string;
  type: NodeType;
  realms: string[];
  suggestedZone: string;
  reasoning: string;
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

  activeRealms: string[];
  topology?: {
    nodeCount: number;
    realmDistribution?: Record<string, number>;
    centralNodes?: string[];
    clusters?: unknown[];
  };
  mapContext?: {
    title?: string;
    parentTitle?: string;
    description?: string;
    mapLevel?: MapLevel;
    mapTitle?: string;
    parentMapTitle?: string;
  };
}

export interface Tension {
  title: string;
  conceptA: string;
  conceptB: string;
  description: string;
  reasoning: string;
}

export interface EmergentTheme {
  label: string;
  description: string;
  intensity: 'faint' | 'building' | 'strong';
}

export interface CrystallizationResult {
  coreNodes: CartographerVariation[];
  tensions: Tension[];
  emergentThemes: EmergentTheme[];
  candidateExpansions: string[];
  spatialInsight: string;
}
