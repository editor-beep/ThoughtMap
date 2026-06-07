import { create } from 'zustand';
import { DEBUG, IS_DEV } from '../config/debug';
import { persist } from 'zustand/middleware';
import { ThoughtNode, ThoughtEdge, Realm, ChatMessage, NodeType, EdgeType, TerrainId, CartographerVariation, CartographerContext, CartographerStyle, CartographerMode, MapDocument, CrystallizationResult, Tension } from '../types';
import { adaptVaultMindToThoughtMap, detectImportType, normalizeImport } from '../lib/importAdapters';
import { EDGE_TYPES } from '../lib/constants';
import { cleanForExtraction, normalizeNodePosition } from '../lib/storeUtils';

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

// ─── Store ─────────────────────────────────────────────────────────────────

type UndoAction = { type: 'deleteNode'; node: ThoughtNode; edges: ThoughtEdge[] } | { type: 'deleteEdge'; edge: ThoughtEdge };

interface MapState {
  maps: Record<string, MapDocument>;
  currentMapId: string;
  nodes: ThoughtNode[];
  edges: ThoughtEdge[];
  realms: Realm[];
  chatHistory: ChatMessage[];
  activeConversationId: string | null;
  isStreaming: boolean;
  focusedNodeId: string | null;
  selectedEdgeId: string | null;
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
  cartographerStyle: CartographerStyle;
  cartographerMode: CartographerMode;
  importStatusMessage: string | null;
  activeTerrain: TerrainId;

  crystallizationResult: CrystallizationResult | null;
  crystallizationLoading: boolean;
  crystallizationTurns: number;
  crystallizationAppliedNodes: number[];
  crystallizationAppliedTensions: number[];

  addNode: (node: Omit<ThoughtNode, 'id' | 'createdAt'>) => string;
  updateNodePosition: (id: string, x: number, y: number) => void;
  updateNode: (id: string, updates: Partial<Pick<ThoughtNode, 'title' | 'content' | 'type' | 'realms' | 'tags' | 'attachments' | 'comments' | 'isAnchor'>>) => void;
  deleteNode: (id: string) => void;
  addEdge: (source: string, target: string, type: EdgeType) => void;
  deleteEdge: (id: string) => void;
  updateEdgeType: (edgeId: string, nextType: EdgeType) => void;
  setSelectedEdgeId: (edgeId: string | null) => void;
  toggleRealm: (id: string) => void;
  addRealm: (name: string) => string;
  sendChatMessage: (content: string, voice?: CartographerStyle) => Promise<void>;
  extractToMap: (messageId: string, type: NodeType, title: string, realmId?: string) => void;
  focusNode: (id: string) => void;
  clearFocusedNode: () => void;
  setNodeSearchQuery: (q: string) => void;
  setMasterMapSearchQuery: (q: string) => void;
  setMasterMapViewMode: (mode: 'grid' | 'archive') => void;
  setMasterMapSortMode: (mode: 'recently-active' | 'recently-created' | 'alphabetical' | 'largest') => void;
  nodeChats: Record<string, ChatMessage[]>;
  nodeChatStreaming: string | null;
  sendNodeChatMessage: (nodeId: string, nodeTitle: string, nodeContent: string, message: string, voice?: CartographerStyle) => Promise<void>;

  undo: () => void;
  importMap: (data: unknown) => void;

  requestCartographerExtraction: (messageId: string) => Promise<void>;
  requestCartographerExtractionFromContent: (content: string) => Promise<void>;
  applyCartographerSuggestion: (variationIndex: number, customTitle?: string) => void;
  dismissCartographerSuggestions: () => void;
  openCartographerPanel: () => void;
  closeCartographerPanel: () => void;
  setCartographerStyle: (style: CartographerStyle) => void;
  setCartographerMode: (mode: CartographerMode) => void;
  requestWanderMode: () => Promise<void>;
  requestAnalyzeMode: () => Promise<void>;
  clearWanderResponse: () => void;
  createMap: (title: string, parentMapId?: string, parentNodeId?: string) => string;
  switchMap: (mapId: string) => void;
  renameMap: (id: string, title: string) => void;
  openSubMap: (nodeId: string) => void;
  splitNodeIntoNewMap: (nodeId: string, includeNeighbors?: boolean) => string | null;
  exitToParent: () => void;
  linkMapToNode: (childMapId: string, parentNodeId: string, parentNodeMapId: string) => void;
  decoupleMapFromNode: (childMapId: string) => void;

  crystallizeConversationWindow: (turns?: number) => Promise<void>;
  setCrystallizationTurns: (n: number) => void;
  applyCrystallizationNode: (index: number, customTitle?: string) => void;
  applyCrystallizationTension: (index: number) => void;
  noteCrystallizationTheme: (index: number) => void;
  sendCrystallizationExpansion: (phrase: string) => Promise<void>;
  dismissCrystallization: () => void;
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
      activeTerrain: 'blackspace' as TerrainId,
      activeConversationId: 'default',
      isStreaming: false,
      focusedNodeId: null,
      selectedEdgeId: null,
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
      cartographerStyle: "default",
      cartographerMode: "wander",
      importStatusMessage: null,

      crystallizationResult: null,
      crystallizationLoading: false,
      crystallizationTurns: 3,
      crystallizationAppliedNodes: [],
      crystallizationAppliedTensions: [],
      createMap: (title, parentMapId, parentNodeId) => {
        const id = `map_${crypto.randomUUID()}`;
        const now = new Date().toISOString();
        const map: MapDocument = {
          id,
          title,
          level: parentMapId ? 'detail' : 'master',
          parentMapId: parentMapId ?? null,
          parentNodeId: parentNodeId ?? null,
          sourceNodeId: parentNodeId ?? null,
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
      openSubMap: (nodeId) => {
        const node = get().nodes.find((n) => n.id === nodeId);
        const childMapId = node?.childMapId ?? node?.subMapId;
        if (childMapId) get().switchMap(childMapId);
      },
      splitNodeIntoNewMap: (nodeId, includeNeighbors = false) => {
        const state = get();
        const sourceNode = state.nodes.find((n) => n.id === nodeId);
        const currentMap = state.maps[state.currentMapId];
        if (!sourceNode || !currentMap) return null;

        const now = new Date().toISOString();
        const mapId = `map_${crypto.randomUUID()}`;
        const rootId = `node_${crypto.randomUUID()}`;
        const importedNodes = includeNeighbors
          ? state.nodes.filter((n) => n.id !== sourceNode.id && state.edges.some((e) => (e.source === sourceNode.id && e.target === n.id) || (e.target === sourceNode.id && e.source === n.id)))
          : [];
        const importedNodeIdMap: Record<string, string> = {};
        importedNodes.forEach((n) => { importedNodeIdMap[n.id] = `node_${crypto.randomUUID()}`; });

        const seededRoot: ThoughtNode = { ...sourceNode, id: rootId, createdAt: sourceNode.createdAt ?? now };
        const duplicatedNeighbors: ThoughtNode[] = importedNodes.map((n) => ({ ...n, id: importedNodeIdMap[n.id], createdAt: n.createdAt ?? now }));
        const childEdges: ThoughtEdge[] = includeNeighbors
          ? state.edges
            .filter((e) => (e.source === sourceNode.id && importedNodeIdMap[e.target]) || (e.target === sourceNode.id && importedNodeIdMap[e.source]) || (importedNodeIdMap[e.source] && importedNodeIdMap[e.target]))
            .map((e) => ({
              ...e,
              id: `edge_${crypto.randomUUID()}`,
              source: e.source === sourceNode.id ? rootId : importedNodeIdMap[e.source],
              target: e.target === sourceNode.id ? rootId : importedNodeIdMap[e.target],
            }))
          : [];

        const newMap: MapDocument = {
          id: mapId,
          title: sourceNode.title,
          level: 'detail',
          parentMapId: state.currentMapId,
          parentNodeId: sourceNode.id,
          sourceNodeId: sourceNode.id,
          nodes: [seededRoot, ...duplicatedNeighbors],
          edges: childEdges,
          createdAt: now,
          updatedAt: now,
          metadata: {
            description: sourceNode.content.slice(0, 280),
          },
        };

        set((s) => ({
          maps: {
            ...s.maps,
            [s.currentMapId]: { ...s.maps[s.currentMapId], nodes: s.nodes, edges: s.edges, updatedAt: now },
            [mapId]: newMap,
          },
          nodes: s.nodes.map((n) => (n.id === sourceNode.id ? { ...n, childMapId: mapId, subMapId: mapId, isSemanticField: true } : n)),
        }));
        return mapId;
      },
      exitToParent: () => {
        const { maps, currentMapId } = get();
        const current = maps[currentMapId];
        if (current?.parentMapId) get().switchMap(current.parentMapId);
      },

      linkMapToNode: (childMapId, parentNodeId, parentNodeMapId) => {
        const { maps, currentMapId, nodes } = get();
        const now = new Date().toISOString();
        const updatedParentNodes = (maps[parentNodeMapId]?.nodes ?? []).map((n) =>
          n.id === parentNodeId
            ? { ...n, childMapId, subMapId: childMapId, isSemanticField: true }
            : n
        );
        set((s) => ({
          ...(parentNodeMapId === currentMapId
            ? { nodes: nodes.map((n) => n.id === parentNodeId ? { ...n, childMapId, subMapId: childMapId, isSemanticField: true } : n) }
            : {}),
          maps: {
            ...s.maps,
            [parentNodeMapId]: { ...s.maps[parentNodeMapId], nodes: updatedParentNodes, updatedAt: now },
            [childMapId]: { ...s.maps[childMapId], parentMapId: parentNodeMapId, parentNodeId, updatedAt: now },
          },
        }));
      },

      decoupleMapFromNode: (childMapId) => {
        const { maps, currentMapId } = get();
        const childMap = maps[childMapId];
        if (!childMap?.parentNodeId) return;
        const { parentNodeId, parentMapId } = childMap;
        if (!parentMapId) return;
        const now = new Date().toISOString();
        const updatedParentNodes = (maps[parentMapId]?.nodes ?? []).filter((n) => n.id !== parentNodeId);
        set((s) => ({
          ...(parentMapId === currentMapId
            ? { nodes: s.nodes.filter((n) => n.id !== parentNodeId) }
            : {}),
          maps: {
            ...s.maps,
            [parentMapId]: { ...s.maps[parentMapId], nodes: updatedParentNodes, updatedAt: now },
            [childMapId]: { ...s.maps[childMapId], parentMapId: MASTER_MAP_ID, parentNodeId: null, sourceNodeId: null, updatedAt: now },
          },
        }));
      },

      addNode: (nodeData) => {
        const existingNodes = get().nodes;
        const { x, y } = normalizeNodePosition(nodeData, existingNodes);
        const id = `node_${crypto.randomUUID()}`;
        const newNode: ThoughtNode = { ...nodeData, x, y, id, createdAt: new Date().toISOString() };
        if (process.env.NODE_ENV !== 'production') {
          if (IS_DEV && DEBUG.performance) console.log('[NODE SPAWN]', {
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
        if (!Number.isFinite(x) || !Number.isFinite(y)) {
          console.error('[INVALID DRAG POSITION — SKIPPING UPDATE]', { nodeId: id, nextPosition: { x, y } });
          return;
        }
        set((state) => ({
          nodes: state.nodes.map((node) => {
            if (node.id !== id) return node;
            return {
              ...node,
              x,
              y,
            };
          }),
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

      updateEdgeType: (edgeId, nextType) => {
        console.log('[EDGE UPDATE]', { edgeId, nextType });
        set((state) => ({
          edges: state.edges.map((edge) => (edge.id === edgeId ? { ...edge, type: nextType } : edge)),
        }));
      },

      deleteEdge: (id) => {
        const { edges, undoStack } = get();
        const edge = edges.find((e) => e.id === id);
        if (edge) {
          set({
            undoStack: [...undoStack.slice(-49), { type: 'deleteEdge', edge }],
            edges: edges.filter((e) => e.id !== id),
            selectedEdgeId: get().selectedEdgeId === id ? null : get().selectedEdgeId,
          });
        }
      },

      setSelectedEdgeId: (edgeId) => {
        console.log('[EDGE SELECT]', edgeId);
        set({ selectedEdgeId: edgeId });
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

      sendChatMessage: async (content, voice = 'default') => {
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
            body: JSON.stringify({ messages: history, voice }),
            signal: AbortSignal.timeout(45000),
          });

        const streamResponse = async (res: Response) => {
          if (!res.ok || !res.body) {
            if (res.status === 403) { throw new Error('Access denied'); }
            if (res.status === 401) throw new Error('Please sign in to use this feature');
            if (res.status === 504) throw new Error('The AI took too long to respond');
            let apiErr = `API error: ${res.status}`;
            try { const body = await res.json(); if (body.error) apiErr = body.error; } catch { /**/ }
            throw new Error(apiErr);
          }

          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() ?? '';
            for (const line of lines) {
              if (!line.startsWith('data: ')) continue;
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
                const validTypes: EdgeType[] = EDGE_TYPES;
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

      focusNode: (id) => set({ focusedNodeId: id }),
      clearFocusedNode: () => set({ focusedNodeId: null }),
      setNodeSearchQuery: (q) => set({ nodeSearchQuery: q }),
      setMasterMapSearchQuery: (q) => set({ masterMapSearchQuery: q }),
      setMasterMapViewMode: (mode) => set({ masterMapViewMode: mode }),
      setMasterMapSortMode: (mode) => set({ masterMapSortMode: mode }),

      sendNodeChatMessage: async (nodeId, nodeTitle, nodeContent, message, voice = 'default') => {
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
            body: JSON.stringify({ messages: contextMessages, voice }),
            signal: AbortSignal.timeout(45000),
          });

          if (!res.ok || !res.body) throw new Error(`API error: ${res.status}`);
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() ?? '';
            for (const line of lines) {
              if (!line.startsWith('data: ')) continue;
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
        const history = get().chatHistory;
        const message = history.find((m) => m.id === messageId);
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
          activeRealms: state.realms.filter((r) => r.isActive).map((r) => r.id),
          topology: { nodeCount: state.nodes.length },
          mapContext: currentMapDoc ? {
            title: currentMapDoc.title,
            parentTitle: parentMapDoc?.title,
            mapLevel: currentMapDoc.level,
            mapTitle: currentMapDoc.title,
            parentMapTitle: parentMapDoc?.title,
          } : undefined,
        };

        const msgIndex = history.findIndex((m) => m.id === messageId);
        const userPrompt = history.slice(0, msgIndex).reverse().find((m) => m.role === 'user');
        const cleanContent = cleanForExtraction(message.content);
        const extractionMessage = userPrompt
          ? `User was exploring: "${cleanForExtraction(userPrompt.content)}"\n\nAI response to crystallize:\n${cleanContent}`
          : cleanContent;

        try {
          const res = await fetch('/api/cartographer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mode: 'extract', style: get().cartographerStyle, message: extractionMessage, context }),
            signal: AbortSignal.timeout(30000),
          });

          if (!res.ok) {
            if (res.status === 401) { set({ cartographerLoading: false }); return; }
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
          activeRealms: state.realms.filter((r) => r.isActive).map((r) => r.id),
          topology: { nodeCount: state.nodes.length },
          mapContext: currentMapDoc ? {
            title: currentMapDoc.title,
            parentTitle: parentMapDoc?.title,
            mapLevel: currentMapDoc.level,
            mapTitle: currentMapDoc.title,
            parentMapTitle: parentMapDoc?.title,
          } : undefined,
        };

        try {
          const res = await fetch('/api/cartographer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mode: 'extract', style: get().cartographerStyle, message: cleanForExtraction(content), context }),
            signal: AbortSignal.timeout(30000),
          });

          if (!res.ok) {
            if (res.status === 401) { set({ cartographerLoading: false }); return; }
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

        if (variation.suggestedZone?.startsWith('near:')) {
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
      setCartographerStyle: (style) => set({ cartographerStyle: style }),
      setCartographerMode: (mode) => set({ cartographerMode: mode }),
      closeCartographerPanel: () => set({ cartographerPanelOpen: false, cartographerWanderResponse: null }),

      requestWanderMode: async () => {
        set({ cartographerLoading: true, cartographerWanderResponse: null });

        const state = get();
        const currentMapDoc = state.maps[state.currentMapId];
        const parentMapDoc = currentMapDoc?.parentMapId ? state.maps[currentMapDoc.parentMapId] : null;
        const context: CartographerContext = {
          nodes: state.nodes.map((n) => ({ id: n.id, title: n.title, type: n.type, realms: n.realms, x: n.x, y: n.y })),
          activeRealms: state.realms.filter((r) => r.isActive).map((r) => r.id),
          topology: { nodeCount: state.nodes.length },
          mapContext: currentMapDoc ? {
            title: currentMapDoc.title,
            parentTitle: parentMapDoc?.title,
            mapLevel: currentMapDoc.level,
            mapTitle: currentMapDoc.title,
            parentMapTitle: parentMapDoc?.title,
          } : undefined,
        };

        try {
          const res = await fetch('/api/cartographer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mode: 'wander', style: get().cartographerStyle, message: 'Survey the map and offer an observation.', context }),
            signal: AbortSignal.timeout(30000),
          });

          if (!res.ok || !res.body) {
            if (res.status === 401) { set({ cartographerLoading: false }); return; }
            throw new Error('Wander mode failed');
          }

          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let fullResponse = '';
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() ?? '';
            for (const line of lines) {
              if (!line.startsWith('data: ')) continue;
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

      requestAnalyzeMode: async () => {
        set({ cartographerLoading: true, cartographerWanderResponse: null });
        const state = get();
        const context: CartographerContext = {
          nodes: state.nodes.map((n) => ({ id: n.id, title: n.title, type: n.type, realms: n.realms, x: n.x, y: n.y })),
          activeRealms: state.realms.filter((r) => r.isActive).map((r) => r.id),
          topology: { nodeCount: state.nodes.length },
          mapContext: { title: state.maps[state.currentMapId]?.title },
        };
        try {
          const res = await fetch('/api/cartographer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mode: 'analyze', style: state.cartographerStyle, message: 'Analyze the current map.', context }),
            signal: AbortSignal.timeout(30000),
          });
          if (!res.ok) {
            if (res.status === 401) { set({ cartographerLoading: false }); return; }
            let errorMsg = `API error: ${res.status}`;
            try { const body = await res.json(); if (body.error) errorMsg = body.error; } catch { /**/ }
            throw new Error(errorMsg);
          }
          const data = await res.json();
          set({ cartographerWanderResponse: JSON.stringify(data, null, 2) });
        } catch (err) {
          console.error('[Cartographer] Analyze mode failed:', err);
          set({ cartographerWanderResponse: 'Analyze mode failed.' });
        }
        set({ cartographerLoading: false });
      },


      crystallizeConversationWindow: async (turns) => {
        const useTurns = Math.min(turns ?? get().crystallizationTurns, 5);
        set({ crystallizationLoading: true, crystallizationResult: null, crystallizationAppliedNodes: [], crystallizationAppliedTensions: [] });

        const history = get().chatHistory.filter((m) => m.complete !== false);
        const windowMessages = history.slice(-useTurns * 2);
        if (windowMessages.length === 0) {
          set({ crystallizationLoading: false });
          return;
        }

        const windowText = windowMessages.map((m) => `[${m.role === 'user' ? 'User' : 'AI'}]: ${m.content}`).join('\n\n');

        const state = get();
        const currentMapDoc = state.maps[state.currentMapId];
        const parentMapDoc = currentMapDoc?.parentMapId ? state.maps[currentMapDoc.parentMapId] : null;
        const context: CartographerContext = {
          nodes: state.nodes.map((n) => ({ id: n.id, title: n.title, type: n.type, realms: n.realms, x: n.x, y: n.y })),
          activeRealms: state.realms.filter((r) => r.isActive).map((r) => r.id),
          topology: { nodeCount: state.nodes.length },
          mapContext: currentMapDoc ? {
            title: currentMapDoc.title,
            parentTitle: parentMapDoc?.title,
            mapLevel: currentMapDoc.level,
            mapTitle: currentMapDoc.title,
            parentMapTitle: parentMapDoc?.title,
          } : undefined,
        };

        try {
          const res = await fetch('/api/cartographer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mode: 'crystallize', style: get().cartographerStyle, message: windowText, context }),
            signal: AbortSignal.timeout(30000),
          });
          if (!res.ok) {
            if (res.status === 401) { set({ crystallizationLoading: false }); return; }
            let errorMsg = `API error: ${res.status}`;
            try { const body = await res.json(); if (body.error) errorMsg = body.error; } catch { /**/ }
            throw new Error(errorMsg);
          }
          const data = await res.json() as Partial<CrystallizationResult>;
          set({
            crystallizationLoading: false,
            crystallizationResult: {
              coreNodes: data.coreNodes ?? [],
              tensions: data.tensions ?? [],
              emergentThemes: data.emergentThemes ?? [],
              candidateExpansions: data.candidateExpansions ?? [],
              spatialInsight: data.spatialInsight ?? '',
            },
          });
        } catch (err) {
          console.error('[Crystallize] Failed:', err);
          set({ crystallizationLoading: false });
        }
      },

      setCrystallizationTurns: (n) => set({ crystallizationTurns: Math.min(5, Math.max(1, n)) }),

      applyCrystallizationNode: (index, customTitle) => {
        const result = get().crystallizationResult;
        if (!result || index >= result.coreNodes.length) return;
        if (get().crystallizationAppliedNodes.includes(index)) return;

        const variation = result.coreNodes[index];
        const state = get();

        let x = (Math.random() - 0.5) * 400;
        let y = (Math.random() - 0.5) * 400;

        if (variation.suggestedZone?.startsWith('near:')) {
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
        set((s) => ({ crystallizationAppliedNodes: [...s.crystallizationAppliedNodes, index] }));
      },

      applyCrystallizationTension: (index) => {
        const result = get().crystallizationResult;
        if (!result || index >= result.tensions.length) return;
        if (get().crystallizationAppliedTensions.includes(index)) return;

        const tension: Tension = result.tensions[index];
        const state = get();

        const x = (Math.random() - 0.5) * 400;
        const y = (Math.random() - 0.5) * 400;

        const nodeId = get().addNode({
          title: tension.title,
          content: tension.description,
          type: 'contradiction',
          realms: [],
          x,
          y,
        });

        // Connect to existing nodes matching conceptA or conceptB
        const findNode = (label: string) =>
          state.nodes.find((n) => n.title.toLowerCase().trim() === label.toLowerCase().trim());

        const nodeA = findNode(tension.conceptA);
        const nodeB = findNode(tension.conceptB);
        if (nodeA) get().addEdge(nodeId, nodeA.id, 'contradicts');
        if (nodeB) get().addEdge(nodeId, nodeB.id, 'contradicts');

        get().focusNode(nodeId);
        set((s) => ({ crystallizationAppliedTensions: [...s.crystallizationAppliedTensions, index] }));
      },

      noteCrystallizationTheme: (index) => {
        const result = get().crystallizationResult;
        if (!result || index >= result.emergentThemes.length) return;
        const theme = result.emergentThemes[index];
        const x = (Math.random() - 0.5) * 400;
        const y = (Math.random() - 0.5) * 400;
        const nodeId = get().addNode({
          title: theme.label,
          content: theme.description,
          type: 'fragment',
          realms: [],
          x,
          y,
        });
        get().focusNode(nodeId);
      },

      sendCrystallizationExpansion: async (phrase) => {
        await get().sendChatMessage(phrase);
      },

      dismissCrystallization: () => {
        set({ crystallizationResult: null, crystallizationAppliedNodes: [], crystallizationAppliedTensions: [] });
      },

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
          const allowed: EdgeType[] = EDGE_TYPES;
          return typeof value === 'string' && allowed.includes(value as EdgeType) ? (value as EdgeType) : 'references';
        };

        set({ importStatusMessage: 'Parsing archive…' });
        if (IS_DEV && DEBUG.imports) console.log('[IMPORT]', raw);

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

        if (IS_DEV && DEBUG.imports) console.log('[IMPORT TYPE]', importType);
        if (IS_DEV && DEBUG.imports) console.log('[ADAPTED IMPORT]', adapted);
        if (IS_DEV && DEBUG.imports) console.log('[NODES]', adapted.nodes.length);
        if (IS_DEV && DEBUG.imports) console.log('[EDGES]', adapted.edges.length);

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

        if (IS_DEV && DEBUG.imports) console.log('[NORMALIZED]', { nodes, edges, realms });
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
          if (IS_DEV && DEBUG.imports) console.log('[NAVIGATOR INGEST]', importSuggestions);
          if (IS_DEV && DEBUG.imports) console.log('[IMPORT COUNTS]', { nodes: newNodes.length, edges: newEdges.length, malformedNodes: nodes.length - newNodes.length });
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
          nodeChats: state.nodeChats,
          cartographerStyle: state.cartographerStyle,
          cartographerMode: state.cartographerMode,
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
