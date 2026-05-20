import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ThoughtNode, ThoughtEdge, Realm, ChatMessage, NodeType, EdgeType, TerrainId, CartographerVariation, CartographerContext } from '@types';

interface MapState {
  nodes: ThoughtNode[];
  edges: ThoughtEdge[];
  realms: Realm[];
  chatHistory: ChatMessage[];
  activeTerrain: TerrainId;
  activeConversationId: string | null;
  isStreaming: boolean;
  focusedNodeId: string | null;

  // Cartographer Agent state
  cartographerLoading: boolean;
  cartographerSuggestions: CartographerVariation[] | null;
  cartographerInsight: string | null;
  cartographerExtractingMessageId: string | null;
  cartographerPanelOpen: boolean;
  cartographerWanderResponse: string | null;

  addNode: (node: Omit<ThoughtNode, 'id' | 'createdAt'>) => string;
  updateNodePosition: (id: string, x: number, y: number) => void;
  updateNode: (id: string, updates: Partial<Pick<ThoughtNode, 'title' | 'content' | 'type' | 'realms'>>) => void;
  deleteNode: (id: string) => void;
  addEdge: (source: string, target: string, type: EdgeType) => void;
  deleteEdge: (id: string) => void;
  toggleRealm: (id: string) => void;
  sendChatMessage: (content: string) => Promise<void>;
  extractToMap: (messageId: string, type: NodeType, title: string) => void;
  setTerrain: (id: TerrainId) => void;
  focusNode: (id: string) => void;
  clearFocusedNode: () => void;

  // Cartographer Agent actions
  requestCartographerExtraction: (messageId: string) => Promise<void>;
  applyCartographerSuggestion: (variationIndex: number, customTitle?: string) => void;
  dismissCartographerSuggestions: () => void;
  openCartographerPanel: () => void;
  closeCartographerPanel: () => void;
  requestWanderMode: () => Promise<void>;
  clearWanderResponse: () => void;
}

const INITIAL_REALMS: Realm[] = [
  { id: 'humor', name: 'Humor', symbol: '✦', color: '#f59e0b', isActive: true },
  { id: 'mythology', name: 'Mythology', symbol: '𓆃', color: '#a855f7', isActive: true },
  { id: 'worldbuilding', name: 'Worldbuilding', symbol: '⚛', color: '#06b6d4', isActive: true },
  { id: 'rituals', name: 'Rituals', symbol: '🕯', color: '#f43f5e', isActive: true },
  { id: 'horror', name: 'Horror', symbol: '👁', color: '#10b981', isActive: true },
  { id: 'philosophy', name: 'Philosophy', symbol: '☱', color: '#3b82f6', isActive: true }
];

const INITIAL_CHAT: ChatMessage[] = [
  {
    id: 'welcome-msg',
    role: 'assistant',
    content: 'The canvas is listening. What patterns shall we project onto the void tonight?',
    timestamp: new Date().toISOString()
  }
];

export const useThoughtStore = create<MapState>()(
  persist(
    (set, get) => ({
      nodes: [],
      edges: [],
      realms: INITIAL_REALMS,
      chatHistory: INITIAL_CHAT,
      activeTerrain: 'the-void' as TerrainId,
      activeConversationId: 'default',
      isStreaming: false,
      focusedNodeId: null,

      // Cartographer Agent initial state
      cartographerLoading: false,
      cartographerSuggestions: null,
      cartographerInsight: null,
      cartographerExtractingMessageId: null,
      cartographerPanelOpen: false,
      cartographerWanderResponse: null,

      addNode: (nodeData) => {
        const id = `node_${crypto.randomUUID()}`;
        const newNode: ThoughtNode = { ...nodeData, id, createdAt: new Date().toISOString() };
        set((state) => ({ nodes: [...state.nodes, newNode] }));
        return id;
      },

      updateNodePosition: (id, x, y) => {
        set((state) => ({
          nodes: state.nodes.map((node) => (node.id === id ? { ...node, x, y } : node))
        }));
      },

      updateNode: (id, updates) => {
        set((state) => ({
          nodes: state.nodes.map((node) => (node.id === id ? { ...node, ...updates } : node))
        }));
      },

      deleteNode: (id) => {
        set((state) => ({
          nodes: state.nodes.filter((n) => n.id !== id),
          edges: state.edges.filter((e) => e.source !== id && e.target !== id)
        }));
      },

      addEdge: (source, target, type) => {
        const id = `edge_${crypto.randomUUID()}`;
        set((state) => ({ edges: [...state.edges, { id, source, target, type }] }));
      },

      deleteEdge: (id) => {
        set((state) => ({ edges: state.edges.filter((e) => e.id !== id) }));
      },

      toggleRealm: (id) => {
        set((state) => ({
          realms: state.realms.map((r) => (r.id === id ? { ...r, isActive: !r.isActive } : r))
        }));
      },

      sendChatMessage: async (content) => {
        const userMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'user',
          content,
          timestamp: new Date().toISOString()
        };
        const assistantId = crypto.randomUUID();
        const assistantMsg: ChatMessage = {
          id: assistantId,
          role: 'assistant',
          content: '',
          timestamp: new Date().toISOString()
        };

        set((state) => ({
          chatHistory: [...state.chatHistory, userMsg, assistantMsg],
          isStreaming: true
        }));

        const history = get()
          .chatHistory
          .map((m) => ({ role: m.role, content: m.content }));

        try {
          const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: history }),
            signal: AbortSignal.timeout(25000),
          });

          if (!res.ok || !res.body) {
            if (res.status === 504) {
              throw new Error('Load failed — the AI took too long to respond');
            }
            let apiErr = `API error: ${res.status}`;
            try {
              const body = await res.json();
              if (body.error) apiErr = body.error;
            } catch { /* ignore */ }
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
                    )
                  }));
                }
              } catch {
                // skip malformed SSE chunks
              }
            }
          }
        } catch (err) {
          const isTimeout = err instanceof Error && (err.name === 'AbortError' || err.name === 'TimeoutError');
          const errorText = isTimeout
            ? 'Load failed — the AI took too long to respond'
            : err instanceof Error ? err.message : 'Load failed';
          set((state) => ({
            chatHistory: state.chatHistory.map((m) =>
              m.id === assistantId ? { ...m, content: `[Error: ${errorText}]` } : m
            )
          }));
        }

        set({ isStreaming: false });
      },

      extractToMap: (messageId, type, title) => {
        const message = get().chatHistory.find((m) => m.id === messageId);
        if (!message) return;

        const activeRealmIds = get()
          .realms.filter((r) => r.isActive)
          .map((r) => r.id);

        const nodeId = get().addNode({
          title,
          content: message.content,
          type,
          realms: activeRealmIds.length ? [activeRealmIds[0]] : ['philosophy'],
          x: (Math.random() - 0.5) * 400,
          y: (Math.random() - 0.5) * 400
        });

        set((state) => ({
          chatHistory: state.chatHistory.map((m) =>
            m.id === messageId ? { ...m, extractedNodeId: nodeId } : m
          )
        }));
      },

      setTerrain: (id) => set({ activeTerrain: id }),
      focusNode: (id) => set({ focusedNodeId: id }),
      clearFocusedNode: () => set({ focusedNodeId: null }),

      // Cartographer Agent actions
      requestCartographerExtraction: async (messageId) => {
        const message = get().chatHistory.find((m) => m.id === messageId);
        if (!message) return;

        set({
          cartographerLoading: true,
          cartographerSuggestions: null,
          cartographerInsight: null,
          cartographerExtractingMessageId: messageId
        });

        // Build context for the Cartographer
        const state = get();
        const context: CartographerContext = {
          nodes: state.nodes.map((n) => ({
            id: n.id,
            title: n.title,
            type: n.type,
            realms: n.realms,
            x: n.x,
            y: n.y
          })),
          activeTerrain: state.activeTerrain,
          activeRealms: state.realms.filter((r) => r.isActive).map((r) => r.id)
        };

        try {
          const res = await fetch('/api/cartographer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              mode: 'extract',
              message: message.content,
              context
            }),
            signal: AbortSignal.timeout(30000)
          });

          if (!res.ok) {
            let errorMsg = `API error: ${res.status}`;
            try {
              const body = await res.json();
              if (body.error) errorMsg = body.error;
            } catch { /* ignore */ }
            throw new Error(errorMsg);
          }

          const data = await res.json();
          set({
            cartographerLoading: false,
            cartographerSuggestions: data.variations ?? [],
            cartographerInsight: data.spatialInsight ?? null
          });
        } catch (err) {
          console.error('[Cartographer] Extraction failed:', err);
          set({
            cartographerLoading: false,
            cartographerSuggestions: null,
            cartographerInsight: null,
            cartographerExtractingMessageId: null
          });
        }
      },

      applyCartographerSuggestion: (variationIndex, customTitle) => {
        const suggestions = get().cartographerSuggestions;
        const messageId = get().cartographerExtractingMessageId;
        if (!suggestions || !messageId || variationIndex >= suggestions.length) return;

        const variation = suggestions[variationIndex];
        const state = get();

        // Calculate position based on suggested zone
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
          // Zone-based positioning
          const zoneOffsets: Record<string, { x: number; y: number }> = {
            center: { x: 0, y: 0 },
            northern: { x: 0, y: -300 },
            southern: { x: 0, y: 300 },
            eastern: { x: 300, y: 0 },
            western: { x: -300, y: 0 }
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
          y
        });

        // Mark the message as extracted
        set((s) => ({
          chatHistory: s.chatHistory.map((m) =>
            m.id === messageId ? { ...m, extractedNodeId: nodeId } : m
          ),
          cartographerSuggestions: null,
          cartographerInsight: null,
          cartographerExtractingMessageId: null
        }));
      },

      dismissCartographerSuggestions: () => {
        set({
          cartographerSuggestions: null,
          cartographerInsight: null,
          cartographerExtractingMessageId: null,
          cartographerLoading: false
        });
      },

      openCartographerPanel: () => set({ cartographerPanelOpen: true }),
      closeCartographerPanel: () => set({ cartographerPanelOpen: false, cartographerWanderResponse: null }),

      requestWanderMode: async () => {
        set({ cartographerLoading: true, cartographerWanderResponse: null });

        const state = get();
        const context: CartographerContext = {
          nodes: state.nodes.map((n) => ({
            id: n.id,
            title: n.title,
            type: n.type,
            realms: n.realms,
            x: n.x,
            y: n.y
          })),
          activeTerrain: state.activeTerrain,
          activeRealms: state.realms.filter((r) => r.isActive).map((r) => r.id)
        };

        try {
          const res = await fetch('/api/cartographer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              mode: 'wander',
              message: 'Survey the map and offer an observation.',
              context
            }),
            signal: AbortSignal.timeout(30000)
          });

          if (!res.ok || !res.body) {
            throw new Error('Wander mode failed');
          }

          // Stream the response
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
                if (token) {
                  fullResponse += token;
                  set({ cartographerWanderResponse: fullResponse });
                }
              } catch {
                // skip malformed chunks
              }
            }
          }
        } catch (err) {
          console.error('[Cartographer] Wander mode failed:', err);
          set({ cartographerWanderResponse: 'The Cartographer remains silent... the terrain is difficult to read at present.' });
        }

        set({ cartographerLoading: false });
      },

      clearWanderResponse: () => set({ cartographerWanderResponse: null })
    }),
    {
      name: 'thought-map-storage',
      partialize: (state) => ({
        nodes: state.nodes,
        edges: state.edges,
        realms: state.realms,
        chatHistory: state.chatHistory,
        activeTerrain: state.activeTerrain
      })
    }
  )
);
