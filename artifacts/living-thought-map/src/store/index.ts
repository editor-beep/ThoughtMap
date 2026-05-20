import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ThoughtNode, ThoughtEdge, Realm, ChatMessage, NodeType, EdgeType, TerrainId } from '../types';

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

// ─── Store ─────────────────────────────────────────────────────────────────

interface MapState {
  nodes: ThoughtNode[];
  edges: ThoughtEdge[];
  realms: Realm[];
  chatHistory: ChatMessage[];
  activeTerrain: TerrainId;
  activeConversationId: string | null;
  isStreaming: boolean;
  focusedNodeId: string | null;

  addNode: (node: Omit<ThoughtNode, 'id' | 'createdAt'>) => string;
  updateNodePosition: (id: string, x: number, y: number) => void;
  updateNode: (id: string, updates: Partial<Pick<ThoughtNode, 'title' | 'content' | 'type' | 'realms'>>) => void;
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
      nodes: [],
      edges: [],
      realms: INITIAL_REALMS,
      chatHistory: INITIAL_CHAT,
      activeTerrain: 'the-void' as TerrainId,
      activeConversationId: 'default',
      isStreaming: false,
      focusedNodeId: null,

      addNode: (nodeData) => {
        const id = `node_${crypto.randomUUID()}`;
        const newNode: ThoughtNode = { ...nodeData, id, createdAt: new Date().toISOString() };
        set((state) => ({ nodes: [...state.nodes, newNode] }));
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
        set((state) => ({
          nodes: state.nodes.filter((n) => n.id !== id),
          edges: state.edges.filter((e) => e.source !== id && e.target !== id),
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
              } catch { /* skip malformed SSE */ }
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
        } catch (err) {
          const isTimeout = err instanceof Error && (err.name === 'AbortError' || err.name === 'TimeoutError');
          const errorText = isTimeout
            ? 'The AI took too long to respond. Try again.'
            : err instanceof Error ? err.message : 'Something went wrong';
          set((state) => ({
            chatHistory: state.chatHistory.map((m) =>
              m.id === assistantId ? { ...m, content: `⚠ ${errorText}` } : m
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
    }),
    {
      name: 'thought-map-storage',
      partialize: (state) => ({
        nodes: state.nodes,
        edges: state.edges,
        realms: state.realms,
        chatHistory: state.chatHistory,
        activeTerrain: state.activeTerrain,
      }),
    }
  )
);
