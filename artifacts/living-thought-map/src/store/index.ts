import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ThoughtNode, ThoughtEdge, Realm, ChatMessage, NodeType, EdgeType, TerrainId, CartographerVariation, CartographerContext, MapDocument } from '../types';
import { adaptVaultMindToThoughtMap, detectImportType, normalizeImport } from '../lib/importAdapters';

// ─── Auto-terrain detection ────────────────────────────────────────────────

const TERRAIN_KEYWORDS: Record<TerrainId, string[]> = {
  'memory-palace': [
    'memory', 'remember', 'recall', 'nostalgia', 'nostalgic', 'past', 'childhood',
    'warmth', 'candle', 'laugh', 'laughter', 'humor', 'funny', 'joke', 'comedy',
    'ritual', 'habit', 'tradition', 'ceremony', 'familiar', 'home', 'comfort',
  ],
  'interstellar-plane': [
    'space', 'cosmos', 'universe', 'star', 'galaxy', 'infinite', 'infinity',
    'philosophy', 'consciousness', 'awareness', 'thought', 'abstract', 'infinite',
    'idea', 'mind', 'concept', 'knowledge', 'science', 'research', 'theory',
    'existence', 'meaning', 'purpose', 'reality', 'perception', 'metaphysics',
  ],
  'terrestrial-globe': [
    'world', 'earth', 'map', 'geography', 'land', 'place', 'territory',
    'culture', 'civilization', 'city', 'country', 'history', 'worldbuilding',
    'setting', 'location', 'landscape', 'travel', 'explore', 'terrain',
    'continent', 'ocean', 'region', 'nation', 'society',
  ],
  'mythic-landscape': [
    'myth', 'legend', 'magic', 'fantasy', 'creature', 'god', 'goddess',
    'hero', 'sacred', 'dream', 'archetype', 'story', 'ancient', 'spirit',
    'vision', 'symbol', 'quest', 'mystical', 'supernatural', 'divine',
    'folklore', 'ritual', 'enchant', 'prophecy', 'oracle', 'rune',
  ],
  'the-void': [
    'dark', 'void', 'empty', 'nothing', 'silence', 'silent', 'horror',
    'fear', 'shadow', 'abyss', 'death', 'nihilism', 'existential',
    'meaningless', 'blank', 'alone', 'isolation', 'dread', 'eerie',
    'haunting', 'terror', 'ghost', 'hollow', 'disappear', 'absent',
  ],
};

function detectTerrainFromMessages(messages: ChatMessage[]): TerrainId | null {
  if (messages.length < 3) return null;

  const recentText = messages
    .slice(-6)
    .map((m) => m.content.toLowerCase())
    .join(' ');

  const scores: Record<TerrainId, number> = {
    'memory-palace': 0,
    'interstellar-plane': 0,
    'terrestrial-globe': 0,
    'mythic-landscape': 0,
    'the-void': 0,
  };

  for (const [terrain, words] of Object.entries(TERRAIN_KEYWORDS) as [TerrainId, string[]][]) {
    for (const word of words) {
      const re = new RegExp(`\\b${word}`, 'g');
      const hits = recentText.match(re);
      if (hits) scores[terrain] += hits.length;
    }
  }

  let maxScore = 2; // minimum threshold — don't shift for a single keyword
  let detected: TerrainId | null = null;
  for (const [t, s] of Object.entries(scores) as [TerrainId, number][]) {
    if (s > maxScore) { maxScore = s; detected = t; }
  }

  return detected;
}

// ─── Map constants ─────────────────────────────────────────────────────────

export const MASTER_MAP_ID = 'master-map';
const INITIAL_MASTER_MAP: MapDocument = {
  id: MASTER_MAP_ID,
  title: 'Master Map',
  level: 'master',
  parentMapId: null,
  parentNodeId: null,
  nodes: [],
  edges: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const DEFAULT_SPAWN_RADIUS = 220;
const MAX_WORLD_COORD = 20000;

function isFiniteCoordinate(value: number): boolean {
  return Number.isFinite(value) && !Number.isNaN(value);
}

function clampWorld(value: number): number {
  return Math.max(-MAX_WORLD_COORD, Math.min(MAX_WORLD_COORD, value));
}

function generateSpawnPosition(existingNodes: ThoughtNode[]): { x: number; y: number } {
  if (existingNodes.length === 0) return { x: 0, y: 0 };
  const index = existingNodes.length;
  const angle = index * 0.92;
  const radius = DEFAULT_SPAWN_RADIUS + (index % 5) * 28;
  const cx = existingNodes.reduce((sum, n) => sum + n.x, 0) / existingNodes.length;
  const cy = existingNodes.reduce((sum, n) => sum + n.y, 0) / existingNodes.length;
  return {
    x: cx + Math.cos(angle) * radius,
    y: cy + Math.sin(angle) * radius,
  };
}

function normalizeNodePosition(
  nodeData: Omit<ThoughtNode, 'id' | 'createdAt'>,
  existingNodes: ThoughtNode[],
): { x: number; y: number } {
  const fallback = generateSpawnPosition(existingNodes);
  let x = isFiniteCoordinate(nodeData.x) ? nodeData.x : fallback.x;
  let y = isFiniteCoordinate(nodeData.y) ? nodeData.y : fallback.y;

  const overlapCount = existingNodes.filter((n) => Math.abs(n.x - x) < 12 && Math.abs(n.y - y) < 12).length;
  if (overlapCount > 0) {
    const jitterAngle = Math.random() * Math.PI * 2;
    const jitterRadius = 90 + overlapCount * 26;
    x += Math.cos(jitterAngle) * jitterRadius;
    y += Math.sin(jitterAngle) * jitterRadius;
  }

  return { x: clampWorld(x), y: clampWorld(y) };
}

// ─── Store ─────────────────────────────────────────────────────────────────

type UndoAction = { type: 'deleteNode'; node: ThoughtNode; edges: ThoughtEdge[] } | { type: 'deleteEdge'; edge: ThoughtEdge };

interface MapState {
  maps: Record<string, MapDocument>;
  currentMapId: string;
  nodes: ThoughtNode[];
  edges: ThoughtEdge[];
  realms: Realm[];
  chatHistory: ChatMessage[];
  activeTerrain: TerrainId;
  activeConversationId: string | null;
  isStreaming: boolean;
  focusedNodeId: string | null;
  undoStack: UndoAction[];
  nodeSearchQuery: string;
  masterMapSearchQuery: string;
  masterMapViewMode: 'grid' | 'archive';
  masterMapSortMode: 'recently-active' | 'recently-created' | 'alphabetical' | 'largest';

  cartographerLoading: boolean;
  cartographerSuggestions: CartographerVariation[] | null;
  cartographerInsight: string | null;
  cartographerExtractingMessageId: string | null;
  cartographerAppliedIndices: number[];
  cartographerPanelOpen: boolean;
  cartographerWanderResponse: string | null;
  importStatusMessage: string | null;

  addNode: (node: Omit<ThoughtNode, 'id' | 'createdAt'>) => string;
  updateNodePosition: (id: string, x: number, y: number) => void;
  updateNode: (id: string, updates: Partial<Pick<ThoughtNode, 'title' | 'content' | 'type' | 'realms' | 'tags' | 'attachments' | 'comments' | 'isAnchor'>>) => void;
  deleteNode: (id: string) => void;
  addEdge: (source: string, target: string, type: EdgeType) => void;
  deleteEdge: (id: string) => void;
  toggleRealm: (id: string) => void;
  addRealm: (name: string) => string;
  sendChatMessage: (content: string) => Promise<void>;
  extractToMap: (messageId: string, type: NodeType, title: string, realmId?: string) => void;
  setTerrain: (id: TerrainId) => void;
  focusNode: (id: string) => void;
  clearFocusedNode: () => void;
  setNodeSearchQuery: (q: string) => void;
  setMasterMapSearchQuery: (q: string) => void;
  setMasterMapViewMode: (mode: 'grid' | 'archive') => void;
  setMasterMapSortMode: (mode: 'recently-active' | 'recently-created' | 'alphabetical' | 'largest') => void;
  nodeChats: Record<string, ChatMessage[]>;
  nodeChatStreaming: string | null;
  sendNodeChatMessage: (nodeId: string, nodeTitle: string, nodeContent: string, message: string) => Promise<void>;

  undo: () => void;
  importMap: (data: unknown) => void;

  requestCartographerExtraction: (messageId: string) => Promise<void>;
  requestCartographerExtractionFromContent: (content: string) => Promise<void>;
  applyCartographerSuggestion: (variationIndex: number, customTitle?: string) => void;
  dismissCartographerSuggestions: () => void;
  openCartographerPanel: () => void;
  closeCartographerPanel: () => void;
  requestWanderMode: () => Promise<void>;
  clearWanderResponse: () => void;
  createMap: (title: string, parentMapId?: string, parentNodeId?: string) => string;
  switchMap: (mapId: string) => void;
  renameMap: (id: string, title: string) => void;
  createSemanticField: (parentMapId: string, nodeData: Partial<ThoughtNode>) => string;
  openSubMap: (nodeId: string) => void;
  exitToParent: () => void;
}

const INITIAL_REALMS: Realm[] = [
  { id: 'humor',        name: 'Humor',        symbol: '✦', color: '#f59e0b', isActive: true },
  { id: 'mythology',    name: 'Mythology',    symbol: '𓆃', color: '#a855f7', isActive: true },
  { id: 'worldbuilding',name: 'Worldbuilding',symbol: '⚛', color: '#06b6d4', isActive: true },
  { id: 'rituals',      name: 'Rituals',      symbol: '🕯', color: '#f43f5e', isActive: true },
  { id: 'horror',       name: 'Horror',       symbol: '👁', color: '#10b981', isActive: true },
  { id: 'philosophy',   name: 'Philosophy',   symbol: '☱', color: '#3b82f6', isActive: true },
];

const INITIAL_CHAT: ChatMessage[] = [
  {
    id: 'welcome-msg',
    role: 'assistant',
    content: 'The canvas is listening. What patterns shall we project onto the void tonight?',
    timestamp: new Date().toISOString(),
  }
];

export const useThoughtStore = create<MapState>()(
  persist(
    (set, get) => ({
      maps: { [MASTER_MAP_ID]: INITIAL_MASTER_MAP },
      currentMapId: MASTER_MAP_ID,
      nodes: [],
      edges: [],
      realms: INITIAL_REALMS,
      chatHistory: INITIAL_CHAT,
      activeTerrain: 'the-void' as TerrainId,
      activeConversationId: 'default',
      isStreaming: false,
      focusedNodeId: null,
      nodeSearchQuery: '',
      masterMapSearchQuery: '',
      masterMapViewMode: 'grid',
      masterMapSortMode: 'recently-active',
      nodeChats: {} as Record<string, ChatMessage[]>,
      nodeChatStreaming: null as string | null,

      undoStack: [],

      cartographerLoading: false,
      cartographerSuggestions: null,
      cartographerInsight: null,
      cartographerExtractingMessageId: null,
      cartographerAppliedIndices: [],
      cartographerPanelOpen: false,
      cartographerWanderResponse: null,
      importStatusMessage: null,
      createMap: (title, parentMapId, parentNodeId) => {
        const id = `map_${crypto.randomUUID()}`;
        const now = new Date().toISOString();
        const map: MapDocument = {
          id,
          title,
          level: parentMapId ? 'detail' : 'master',
          parentMapId: parentMapId ?? null,
          parentNodeId: parentNodeId ?? null,
          nodes: [],
          edges: [],
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({ maps: { ...state.maps, [id]: map } }));
        return id;
      },
      switchMap: (mapId) => {
        const { maps, currentMapId, nodes, edges } = get();
        if (mapId === currentMapId) return;
        const target = maps[mapId];
        if (!target) return;
        const now = new Date().toISOString();
        set({
          maps: { ...maps, [currentMapId]: { ...maps[currentMapId], nodes, edges, updatedAt: now } },
          currentMapId: mapId,
          nodes: target.nodes,
          edges: target.edges,
        });
      },
      renameMap: (id, title) => {
        set((s) => ({
          maps: { ...s.maps, [id]: { ...s.maps[id], title, updatedAt: new Date().toISOString() } },
        }));
      },
      createSemanticField: (parentMapId, nodeData) => {
        const id = `node_${crypto.randomUUID()}`;
        const subMapId = get().createMap(nodeData.title ?? 'New Detail Map', parentMapId, id);
        const now = new Date().toISOString();
        const semanticNode: ThoughtNode = {
          id,
          title: nodeData.title ?? 'Semantic Field',
          content: nodeData.content ?? '',
          type: nodeData.type ?? 'thought',
          realms: nodeData.realms ?? [],
          x: nodeData.x ?? 0,
          y: nodeData.y ?? 0,
          createdAt: now,
          isSemanticField: true,
          subMapId,
        };
        set((state) => ({ nodes: [...state.nodes, semanticNode] }));
        return id;
      },
      openSubMap: (nodeId) => {
        const node = get().nodes.find((n) => n.id === nodeId);
        if (node?.isSemanticField && node.subMapId) get().switchMap(node.subMapId);
      },
      exitToParent: () => {
        const { maps, currentMapId } = get();
        const current = maps[currentMapId];
        if (current?.parentMapId) get().switchMap(current.parentMapId);
      },

      addNode: (nodeData) => {
        const existingNodes = get().nodes;
        const { x, y } = normalizeNodePosition(nodeData, existingNodes);
        const id = `node_${crypto.randomUUID()}`;
        const newNode: ThoughtNode = { ...nodeData, x, y, id, createdAt: new Date().toISOString() };
        if (process.env.NODE_ENV !== 'production') {
          console.log('[NODE SPAWN]', {
            id,
            x,
            y,
            finite: Number.isFinite(x) && Number.isFinite(y),
            overlapCandidates: existingNodes.filter((n) => Math.abs(n.x - x) < 24 && Math.abs(n.y - y) < 24).map((n) => n.id),
            totalNodesAfterInsert: existingNodes.length + 1,
            realms: newNode.realms,
          });
        }
        set((state) => ({
          nodes: [...state.nodes, newNode],
          realms: state.realms.map((realm) => (
            newNode.realms.includes(realm.id) ? { ...realm, isActive: true } : realm
          )),
        }));
        return id;
      },

      updateNodePosition: (id, x, y) => {
        set((state) => ({
          nodes: state.nodes.map((node) => (node.id === id ? { ...node, x, y } : node)),
        }));
      },

      updateNode: (id, updates) => {
        set((state) => ({
          nodes: state.nodes.map((node) => (node.id === id ? { ...node, ...updates } : node)),
        }));
      },

      deleteNode: (id) => {
        const { nodes, edges, undoStack } = get();
        const node = nodes.find((n) => n.id === id);
        const connectedEdges = edges.filter((e) => e.source === id || e.target === id);
        if (node) {
          set({
            undoStack: [...undoStack.slice(-49), { type: 'deleteNode', node, edges: connectedEdges }],
            nodes: nodes.filter((n) => n.id !== id),
            edges: edges.filter((e) => e.source !== id && e.target !== id),
          });
        }
      },

      addEdge: (source, target, type) => {
        const id = `edge_${crypto.randomUUID()}`;
        set((state) => ({ edges: [...state.edges, { id, source, target, type }] }));
      },

      deleteEdge: (id) => {
        const { edges, undoStack } = get();
        const edge = edges.find((e) => e.id === id);
        if (edge) {
          set({
            undoStack: [...undoStack.slice(-49), { type: 'deleteEdge', edge }],
            edges: edges.filter((e) => e.id !== id),
          });
        }
      },

      toggleRealm: (id) => {
        set((state) => ({
          realms: state.realms.map((r) => (r.id === id ? { ...r, isActive: !r.isActive } : r)),
        }));
      },

      addRealm: (name) => {
        const REALM_COLORS = ['#f59e0b','#a855f7','#06b6d4','#f43f5e','#10b981','#3b82f6','#ec4899','#f97316','#84cc16','#8b5cf6'];
        const REALM_SYMBOLS = ['✦','◈','⬡','◉','▲','☱','⊕','⌘','⬟','◇'];
        const trimmed = name.trim();
        const id = trimmed.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || `realm-${Date.now()}`;
        const existing = get().realms;
        const dupe = existing.find((r) => r.id === id);
        if (dupe) return dupe.id;
        const color = REALM_COLORS[existing.length % REALM_COLORS.length];
        const symbol = REALM_SYMBOLS[existing.length % REALM_SYMBOLS.length];
        set((state) => ({ realms: [...state.realms, { id, name: trimmed, symbol, color, isActive: true }] }));
        return id;
      },

      sendChatMessage: async (content) => {
        const userMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'user',
          content,
          timestamp: new Date().toISOString(),
        };
        const assistantId = crypto.randomUUID();
        const assistantMsg: ChatMessage = {
          id: assistantId,
          role: 'assistant',
          content: '',
          timestamp: new Date().toISOString(),
          complete: false,
        };

        set((state) => ({
          chatHistory: [...state.chatHistory, userMsg],
          isStreaming: true,
        }));

        const history = get().chatHistory.map((m) => ({ role: m.role, content: m.content }));
        set((state) => ({ chatHistory: [...state.chatHistory, assistantMsg] }));

        const makeRequest = () =>
          fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: history }),
            signal: AbortSignal.timeout(45000),
          });

        const streamResponse = async (res: Response) => {
          if (!res.ok || !res.body) {
            if (res.status === 504) throw new Error('The AI took too long to respond');
            let apiErr = `API error: ${res.status}`;
            try { const body = await res.json(); if (body.error) apiErr = body.error; } catch { /**/ }
            throw new Error(apiErr);
          }

          const reader = res.body.getReader();
          const decoder = new TextDecoder();

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const lines = decoder.decode(value).split('\n').filter((l) => l.startsWith('data: '));
            for (const line of lines) {
              const raw = line.slice(6).trim();
              if (raw === '[DONE]') continue;
              try {
                const token = JSON.parse(raw).choices?.[0]?.delta?.content ?? '';
                if (token) {
                  set((state) => ({
                    chatHistory: state.chatHistory.map((m) =>
                      m.id === assistantId ? { ...m, content: m.content + token } : m
                    ),
                  }));
                }
              } catch (parseErr) {
                if (process.env.NODE_ENV !== 'production') {
                  console.warn('[ThoughtMap] Malformed SSE chunk:', raw, parseErr);
                }
              }
            }
          }
        };

        try {
          let res: Response;
          try {
            res = await makeRequest();
          } catch (firstErr) {
            const isTimeout = firstErr instanceof Error &&
              (firstErr.name === 'AbortError' || firstErr.name === 'TimeoutError');
            if (!isTimeout) throw firstErr;

            set((state) => ({
              chatHistory: state.chatHistory.map((m) =>
                m.id === assistantId ? { ...m, content: '↺ Retrying…' } : m
              ),
            }));
            await new Promise((resolve) => setTimeout(resolve, 2000));
            set((state) => ({
              chatHistory: state.chatHistory.map((m) =>
                m.id === assistantId ? { ...m, content: '' } : m
              ),
            }));
            res = await makeRequest();
          }

          await streamResponse(res);

          // Mark the message complete and parse any AI-suggested edges
          set((state) => {
            const finalMsg = state.chatHistory.find((m) => m.id === assistantId);
            const newEdges: ThoughtEdge[] = [];

            if (finalMsg) {
              // Parse LINK: <title1> → <title2> | <relationship>
              const linkRe = /LINK:\s*(.+?)\s*[→>]\s*(.+?)\s*\|\s*(\w+)/gi;
              let match: RegExpExecArray | null;
              while ((match = linkRe.exec(finalMsg.content)) !== null) {
                const [, fromTitle, toTitle, relType] = match;
                const fromNode = state.nodes.find((n) =>
                  n.title.toLowerCase().trim() === fromTitle.toLowerCase().trim()
                );
                const toNode = state.nodes.find((n) =>
                  n.title.toLowerCase().trim() === toTitle.toLowerCase().trim()
                );
                const validTypes: EdgeType[] = ['evolves_from', 'contradicts', 'references', 'remixes', 'supports'];
                const edgeType = validTypes.includes(relType as EdgeType) ? (relType as EdgeType) : 'references';
                if (fromNode && toNode) {
                  newEdges.push({ id: `edge_${crypto.randomUUID()}`, source: fromNode.id, target: toNode.id, type: edgeType });
                }
              }
            }

            return {
              chatHistory: state.chatHistory.map((m) =>
                m.id === assistantId ? { ...m, complete: true } : m
              ),
              edges: [...state.edges, ...newEdges],
            };
          });
        } catch (err) {
          const isTimeout = err instanceof Error && (err.name === 'AbortError' || err.name === 'TimeoutError');
          const errorText = isTimeout
            ? 'The AI took too long to respond. Try again.'
            : err instanceof Error ? err.message : 'Something went wrong';
          set((state) => ({
            chatHistory: state.chatHistory.map((m) =>
              m.id === assistantId ? { ...m, content: `⚠ ${errorText}`, complete: true } : m
            ),
          }));
        }

        set({ isStreaming: false });

        // ── Auto-shift terrain based on conversation theme ──
        const allMessages = get().chatHistory;
        const suggested = detectTerrainFromMessages(allMessages);
        if (suggested && suggested !== get().activeTerrain) {
          set({ activeTerrain: suggested });
        }
      },

      extractToMap: (messageId, type, title, realmId) => {
        const message = get().chatHistory.find((m) => m.id === messageId);
        if (!message) return;

        const nodeId = get().addNode({
          title,
          content: message.content,
          type,
          realms: realmId ? [realmId] : [],
          x: (Math.random() - 0.5) * 400,
          y: (Math.random() - 0.5) * 400,
        });

        set((state) => ({
          chatHistory: state.chatHistory.map((m) =>
            m.id === messageId ? { ...m, extractedNodeId: nodeId } : m
          ),
        }));
      },

      setTerrain: (id) => set({ activeTerrain: id }),
      focusNode: (id) => set({ focusedNodeId: id }),
      clearFocusedNode: () => set({ focusedNodeId: null }),
      setNodeSearchQuery: (q) => set({ nodeSearchQuery: q }),
      setMasterMapSearchQuery: (q) => set({ masterMapSearchQuery: q }),
      setMasterMapViewMode: (mode) => set({ masterMapViewMode: mode }),
      setMasterMapSortMode: (mode) => set({ masterMapSortMode: mode }),

      sendNodeChatMessage: async (nodeId, nodeTitle, nodeContent, message) => {
        const previousChat = get().nodeChats[nodeId] ?? [];
        const userMsg: ChatMessage = {
          id: crypto.randomUUID(), role: 'user', content: message, timestamp: new Date().toISOString(),
        };
        const assistantId = crypto.randomUUID();
        const assistantMsg: ChatMessage = {
          id: assistantId, role: 'assistant', content: '', timestamp: new Date().toISOString(),
        };

        set((state) => ({
          nodeChats: { ...state.nodeChats, [nodeId]: [...previousChat, userMsg, assistantMsg] },
          nodeChatStreaming: nodeId,
        }));

        const contextMessages = [
          { role: 'user', content: `We're exploring a concept: "${nodeTitle}".${nodeContent ? ` Context: ${nodeContent}` : ''}` },
          { role: 'assistant', content: `I'll focus our discussion on "${nodeTitle}". What would you like to explore?` },
          ...previousChat.map((m) => ({ role: m.role, content: m.content })),
          { role: 'user', content: message },
        ];

        try {
          const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: contextMessages }),
            signal: AbortSignal.timeout(45000),
          });

          if (!res.ok || !res.body) throw new Error(`API error: ${res.status}`);
          const reader = res.body.getReader();
          const decoder = new TextDecoder();

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const lines = decoder.decode(value).split('\n').filter((l) => l.startsWith('data: '));
            for (const line of lines) {
              const raw = line.slice(6).trim();
              if (raw === '[DONE]') continue;
              try {
                const token = JSON.parse(raw).choices?.[0]?.delta?.content ?? '';
                if (token) {
                  set((state) => ({
                    nodeChats: {
                      ...state.nodeChats,
                      [nodeId]: (state.nodeChats[nodeId] ?? []).map((m) =>
                        m.id === assistantId ? { ...m, content: m.content + token } : m
                      ),
                    },
                  }));
                }
              } catch { /* skip malformed SSE */ }
            }
          }
        } catch (err) {
          const text = err instanceof Error ? err.message : 'Something went wrong';
          set((state) => ({
            nodeChats: {
              ...state.nodeChats,
              [nodeId]: (state.nodeChats[nodeId] ?? []).map((m) =>
                m.id === assistantId ? { ...m, content: `⚠ ${text}` } : m
              ),
            },
          }));
        }

        set({ nodeChatStreaming: null });
      },

      requestCartographerExtraction: async (messageId) => {
        const message = get().chatHistory.find((m) => m.id === messageId);
        if (!message) return;

        set({
          cartographerLoading: true,
          cartographerSuggestions: null,
          cartographerInsight: null,
          cartographerExtractingMessageId: messageId,
          cartographerAppliedIndices: [],
        });

        const state = get();
        const currentMapDoc = state.maps[state.currentMapId];
        const parentMapDoc = currentMapDoc?.parentMapId ? state.maps[currentMapDoc.parentMapId] : null;
        const context: CartographerContext = {
          nodes: state.nodes.map((n) => ({ id: n.id, title: n.title, type: n.type, realms: n.realms, x: n.x, y: n.y })),
          activeTerrain: state.activeTerrain,
          activeRealms: state.realms.filter((r) => r.isActive).map((r) => r.id),
          mapContext: currentMapDoc ? {
            mapLevel: currentMapDoc.level,
            mapTitle: currentMapDoc.title,
            parentMapTitle: parentMapDoc?.title,
          } : undefined,
        };

        try {
          const res = await fetch('/api/cartographer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mode: 'extract', message: message.content, context }),
            signal: AbortSignal.timeout(30000),
          });

          if (!res.ok) {
            let errorMsg = `API error: ${res.status}`;
            try { const body = await res.json(); if (body.error) errorMsg = body.error; } catch { /**/ }
            throw new Error(errorMsg);
          }

          const data = await res.json();
          set({
            cartographerLoading: false,
            cartographerSuggestions: data.variations ?? [],
            cartographerInsight: data.spatialInsight ?? null,
          });
        } catch (err) {
          console.error('[Cartographer] Extraction failed:', err);
          set({
            cartographerLoading: false,
            cartographerSuggestions: null,
            cartographerInsight: null,
            cartographerExtractingMessageId: null,
          });
        }
      },

      requestCartographerExtractionFromContent: async (content) => {
        set({
          cartographerLoading: true,
          cartographerSuggestions: null,
          cartographerInsight: null,
          // Keep a synthetic extraction id so the suggestion panel stays active
          // for wander-mode crystallizations (which are not tied to chatHistory ids).
          cartographerExtractingMessageId: `wander-${Date.now()}`,
          cartographerAppliedIndices: [],
        });

        const state = get();
        const currentMapDoc = state.maps[state.currentMapId];
        const parentMapDoc = currentMapDoc?.parentMapId ? state.maps[currentMapDoc.parentMapId] : null;
        const context: CartographerContext = {
          nodes: state.nodes.map((n) => ({ id: n.id, title: n.title, type: n.type, realms: n.realms, x: n.x, y: n.y })),
          activeTerrain: state.activeTerrain,
          activeRealms: state.realms.filter((r) => r.isActive).map((r) => r.id),
          mapContext: currentMapDoc ? {
            mapLevel: currentMapDoc.level,
            mapTitle: currentMapDoc.title,
            parentMapTitle: parentMapDoc?.title,
          } : undefined,
        };

        try {
          const res = await fetch('/api/cartographer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mode: 'extract', message: content, context }),
            signal: AbortSignal.timeout(30000),
          });

          if (!res.ok) {
            let errorMsg = `API error: ${res.status}`;
            try { const body = await res.json(); if (body.error) errorMsg = body.error; } catch { /**/ }
            throw new Error(errorMsg);
          }

          const data = await res.json();
          set({
            cartographerLoading: false,
            cartographerSuggestions: data.variations ?? [],
            cartographerInsight: data.spatialInsight ?? null,
          });
        } catch (err) {
          console.error('[Cartographer] Content extraction failed:', err);
          set({
            cartographerLoading: false,
            cartographerSuggestions: null,
            cartographerInsight: null,
          });
        }
      },

      applyCartographerSuggestion: (variationIndex, customTitle) => {
        const suggestions = get().cartographerSuggestions;
        const messageId = get().cartographerExtractingMessageId;
        if (!suggestions || variationIndex >= suggestions.length) return;
        if (get().cartographerAppliedIndices.includes(variationIndex)) return;

        const variation = suggestions[variationIndex];
        const state = get();

        let x = (Math.random() - 0.5) * 400;
        let y = (Math.random() - 0.5) * 400;

        if (variation.suggestedZone.startsWith('near:')) {
          const nearNodeId = variation.suggestedZone.slice(5);
          const nearNode = state.nodes.find((n) => n.id === nearNodeId);
          if (nearNode) {
            x = nearNode.x + 150 + (Math.random() - 0.5) * 100;
            y = nearNode.y + (Math.random() - 0.5) * 100;
          }
        } else {
          const zoneOffsets: Record<string, { x: number; y: number }> = {
            center: { x: 0, y: 0 },
            northern: { x: 0, y: -300 },
            southern: { x: 0, y: 300 },
            eastern: { x: 300, y: 0 },
            western: { x: -300, y: 0 },
          };
          const offset = zoneOffsets[variation.suggestedZone] ?? zoneOffsets.center;
          x = offset.x + (Math.random() - 0.5) * 200;
          y = offset.y + (Math.random() - 0.5) * 200;
        }

        const nodeId = get().addNode({
          title: customTitle ?? variation.title,
          content: variation.content,
          type: variation.type,
          realms: variation.realms,
          x,
          y,
        });

        get().focusNode(nodeId);

        if (messageId?.startsWith('import-')) {
          const stateAfterNode = get();
          const currentMap = stateAfterNode.maps[stateAfterNode.currentMapId];
          const metadata = (currentMap?.metadata ?? {}) as Record<string, unknown>;
          const bufferedNodes = (metadata.importBufferNodes as ThoughtNode[] | undefined) ?? [];
          const bufferedEdges = (metadata.importBufferEdges as ThoughtEdge[] | undefined) ?? [];
          const idMap = (metadata.importIdMap as Record<string, string> | undefined) ?? {};
          const sourceImported = bufferedNodes[variationIndex];
          if (sourceImported) {
            idMap[sourceImported.id] = nodeId;
          }
          const readyEdges = bufferedEdges.filter((e) => idMap[e.source] && idMap[e.target]);
          set((s) => ({
            edges: [
              ...s.edges,
              ...readyEdges
                .filter((e) => !s.edges.some((existing) => existing.id === e.id))
                .map((e) => ({
                  id: e.id,
                  source: idMap[e.source],
                  target: idMap[e.target],
                  type: e.type,
                })),
            ],
            maps: {
              ...s.maps,
              [s.currentMapId]: {
                ...s.maps[s.currentMapId],
                metadata: {
                  ...(s.maps[s.currentMapId]?.metadata ?? {}),
                  importIdMap: idMap,
                },
              },
            },
          }));
        }

        // Mark message as extracted on first application; keep panel open for additional selections
        const isFirst = get().cartographerAppliedIndices.length === 0;
        set((s) => ({
          chatHistory: isFirst && messageId
            ? s.chatHistory.map((m) => (m.id === messageId ? { ...m, extractedNodeId: nodeId } : m))
            : s.chatHistory,
          cartographerAppliedIndices: [...s.cartographerAppliedIndices, variationIndex],
        }));
      },

      dismissCartographerSuggestions: () => {
        set({
          cartographerSuggestions: null,
          cartographerInsight: null,
          cartographerExtractingMessageId: null,
          cartographerLoading: false,
          cartographerAppliedIndices: [],
        });
      },

      openCartographerPanel: () => set({ cartographerPanelOpen: true }),
      closeCartographerPanel: () => set({ cartographerPanelOpen: false, cartographerWanderResponse: null }),

      requestWanderMode: async () => {
        set({ cartographerLoading: true, cartographerWanderResponse: null });

        const state = get();
        const currentMapDoc = state.maps[state.currentMapId];
        const parentMapDoc = currentMapDoc?.parentMapId ? state.maps[currentMapDoc.parentMapId] : null;
        const context: CartographerContext = {
          nodes: state.nodes.map((n) => ({ id: n.id, title: n.title, type: n.type, realms: n.realms, x: n.x, y: n.y })),
          activeTerrain: state.activeTerrain,
          activeRealms: state.realms.filter((r) => r.isActive).map((r) => r.id),
          mapContext: currentMapDoc ? {
            mapLevel: currentMapDoc.level,
            mapTitle: currentMapDoc.title,
            parentMapTitle: parentMapDoc?.title,
          } : undefined,
        };

        try {
          const res = await fetch('/api/cartographer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mode: 'wander', message: 'Survey the map and offer an observation.', context }),
            signal: AbortSignal.timeout(30000),
          });

          if (!res.ok || !res.body) throw new Error('Wander mode failed');

          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let fullResponse = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const lines = decoder.decode(value).split('\n').filter((l) => l.startsWith('data: '));
            for (const line of lines) {
              const raw = line.slice(6).trim();
              if (raw === '[DONE]') continue;
              try {
                const token = JSON.parse(raw).choices?.[0]?.delta?.content ?? '';
                if (token) { fullResponse += token; set({ cartographerWanderResponse: fullResponse }); }
              } catch { /**/ }
            }
          }
        } catch (err) {
          console.error('[Cartographer] Wander mode failed:', err);
          set({ cartographerWanderResponse: 'The Cartographer remains silent... the terrain is difficult to read at present.' });
        }

        set({ cartographerLoading: false });
      },

      clearWanderResponse: () => set({ cartographerWanderResponse: null }),

      undo: () => {
        const { undoStack } = get();
        if (undoStack.length === 0) return;
        const action = undoStack[undoStack.length - 1];
        const remaining = undoStack.slice(0, -1);
        if (action.type === 'deleteNode') {
          set((state) => ({
            undoStack: remaining,
            nodes: [...state.nodes, action.node],
            edges: [...state.edges, ...action.edges],
          }));
        } else if (action.type === 'deleteEdge') {
          set((state) => ({
            undoStack: remaining,
            edges: [...state.edges, action.edge],
          }));
        }
      },

      importMap: (raw) => {
        const parseImportPayload = (input: unknown): { nodes: ThoughtNode[]; edges: ThoughtEdge[]; realms: Realm[] } | null => {
          if (!input || typeof input !== 'object') return null;
          const candidate = input as Record<string, unknown>;

          if (Array.isArray(candidate.nodes) && Array.isArray(candidate.edges) && Array.isArray(candidate.realms)) {
            return { nodes: candidate.nodes as ThoughtNode[], edges: candidate.edges as ThoughtEdge[], realms: candidate.realms as Realm[] };
          }

          if (candidate.map && typeof candidate.map === 'object') {
            const map = candidate.map as Record<string, unknown>;
            if (Array.isArray(map.nodes) && Array.isArray(map.edges) && Array.isArray(candidate.realms)) {
              return { nodes: map.nodes as ThoughtNode[], edges: map.edges as ThoughtEdge[], realms: candidate.realms as Realm[] };
            }
          }

          if (Array.isArray(candidate.maps)) {
            const firstMapWithGraph = candidate.maps.find((entry) => {
              if (!entry || typeof entry !== 'object') return false;
              const mapEntry = entry as Record<string, unknown>;
              return Array.isArray(mapEntry.nodes) && Array.isArray(mapEntry.edges);
            }) as Record<string, unknown> | undefined;

            if (firstMapWithGraph && Array.isArray(firstMapWithGraph.nodes) && Array.isArray(firstMapWithGraph.edges) && Array.isArray(candidate.realms)) {
              return { nodes: firstMapWithGraph.nodes as ThoughtNode[], edges: firstMapWithGraph.edges as ThoughtEdge[], realms: candidate.realms as Realm[] };
            }
          }

          return null;
        };

        const normalizeNodeType = (value: unknown): NodeType => {
          const allowed: NodeType[] = ['thought', 'joke', 'character', 'myth', 'research', 'canon', 'contradiction', 'artifact', 'fragment'];
          return typeof value === 'string' && allowed.includes(value as NodeType) ? (value as NodeType) : 'thought';
        };

        const normalizeEdgeType = (value: unknown): EdgeType => {
          const allowed: EdgeType[] = ['evolves_from', 'contradicts', 'references', 'remixes', 'supports'];
          return typeof value === 'string' && allowed.includes(value as EdgeType) ? (value as EdgeType) : 'references';
        };

        set({ importStatusMessage: 'Parsing archive…' });
        console.log('[IMPORT]', raw);

        const importType = detectImportType(raw);
        let adapted: { nodes: ThoughtNode[]; edges: ThoughtEdge[]; realms: Realm[] };

        try {
          if (importType === 'vaultmind') {
            const normalized = normalizeImport(raw);
            adapted = adaptVaultMindToThoughtMap({
              artifacts: normalized.nodes.map((node) => ({
                id: node.id,
                title: node.title,
                body: node.body,
                type: node.type,
                tags: node.tags,
              })),
              relationships: normalized.edges,
            }) as unknown as { nodes: ThoughtNode[]; edges: ThoughtEdge[]; realms: Realm[] };
          } else if (importType === 'thoughtmap') {
            const parsed = parseImportPayload(raw);
            if (!parsed) {
              throw new Error('Malformed JSON import');
            }
            adapted = parsed;
          } else {
            throw new Error('Unsupported import format');
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Malformed JSON import';
          console.error('[IMPORT ERROR]', error);
          set({ importStatusMessage: message });
          return;
        }

        console.log('[IMPORT TYPE]', importType);
        console.log('[ADAPTED IMPORT]', adapted);
        console.log('[NODES]', adapted.nodes.length);
        console.log('[EDGES]', adapted.edges.length);

        set({ importStatusMessage: 'Validating cognition structure…' });
        const nodes = adapted.nodes
          .filter((n) => n && typeof n === 'object')
          .map((n) => ({
            ...n,
            id: n.id || `import-node-${crypto.randomUUID()}`,
            title: n.title || 'Untitled artifact',
            content: n.content || '',
            type: normalizeNodeType(n.type),
            realms: Array.isArray(n.realms) ? n.realms : [],
          })) as ThoughtNode[];
        const edges = adapted.edges
          .filter((e) => e && typeof e === 'object' && typeof e.source === 'string' && typeof e.target === 'string')
          .map((e) => ({
            ...e,
            id: e.id || `import-edge-${crypto.randomUUID()}`,
            type: normalizeEdgeType(e.type),
          })) as ThoughtEdge[];
        const realms = adapted.realms.filter((r) => r && typeof r.id === 'string' && typeof r.name === 'string');

        console.log('[NORMALIZED]', { nodes, edges, realms });
        set((state) => {
          const existingIds = new Set(state.nodes.map((n) => n.id));
          const newNodes = nodes.filter((n) => !existingIds.has(n.id));
          const existingEdgeIds = new Set(state.edges.map((e) => e.id));
          const newEdges = edges.filter((e) => !existingEdgeIds.has(e.id));
          const existingRealmIds = new Set(state.realms.map((r) => r.id));
          const newRealms = realms.filter((r) => !existingRealmIds.has(r.id));
          const importSuggestions: CartographerVariation[] = newNodes.map((n) => ({
            title: n.title,
            content: n.content,
            type: n.type,
            realms: n.realms,
            suggestedZone: 'center',
            reasoning: `Imported artifact ${n.id.slice(0, 8)} available for materialization.`,
          }));
          console.log('[NAVIGATOR INGEST]', importSuggestions);
          console.log('[IMPORT COUNTS]', { nodes: newNodes.length, edges: newEdges.length, malformedNodes: nodes.length - newNodes.length });
          return {
            nodes: state.nodes,
            edges: state.edges,
            realms: [...state.realms, ...newRealms],
            cartographerSuggestions: importSuggestions,
            cartographerInsight: `Imported archive parsed. ${newNodes.length} concepts staged for materialization and ${newEdges.length} relationships detected.`,
            cartographerExtractingMessageId: `import-${Date.now()}`,
            cartographerAppliedIndices: [],
            importStatusMessage: `Success: ${newNodes.length} concepts imported, ${newEdges.length} relationships detected.`,
            // Keep a buffered copy by attaching into maps metadata path via closure below during apply
            maps: {
              ...state.maps,
              [state.currentMapId]: {
                ...state.maps[state.currentMapId],
                metadata: {
                  ...(state.maps[state.currentMapId]?.metadata ?? {}),
                  importBufferNodes: newNodes,
                  importBufferEdges: newEdges,
                },
              },
            },
          };
        });
      },
    }),
    {
      name: 'thought-map-storage',
      partialize: (state) => {
        const now = new Date().toISOString();
        const syncedMaps = {
          ...state.maps,
          [state.currentMapId]: {
            ...state.maps[state.currentMapId],
            nodes: state.nodes,
            edges: state.edges,
            updatedAt: now,
          },
        };
        return {
          maps: syncedMaps,
          currentMapId: state.currentMapId,
          nodes: state.nodes,
          edges: state.edges,
          realms: state.realms,
          chatHistory: state.chatHistory,
          activeTerrain: state.activeTerrain,
          nodeChats: state.nodeChats,
        };
      },
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        // Mark any assistant messages that were incomplete (mid-stream on last close) as failed
        state.chatHistory = state.chatHistory.map((m) =>
          m.role === 'assistant' && m.complete === false
            ? { ...m, content: m.content || '⚠ Message interrupted — please resend.', complete: true }
            : m
        );
        // Absorb legacy flat nodes/edges into master map for users upgrading from pre-maps storage
        if (!state.maps[MASTER_MAP_ID]) {
          state.maps = {
            ...state.maps,
            [MASTER_MAP_ID]: { ...INITIAL_MASTER_MAP, nodes: state.nodes, edges: state.edges },
          };
        }
      },
    }
  )
);
