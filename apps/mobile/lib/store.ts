import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ThoughtNode,
  ThoughtEdge,
  Realm,
  ChatMessage,
  NodeType,
  EdgeType,
  TerrainId,
} from './types';

interface MapState {
  nodes: ThoughtNode[];
  edges: ThoughtEdge[];
  realms: Realm[];
  chatHistory: ChatMessage[];
  activeTerrain: TerrainId;
  isStreaming: boolean;
  focusedNodeId: string | null;

  addNode: (node: Omit<ThoughtNode, 'id' | 'createdAt'>) => string;
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
}

const INITIAL_REALMS: Realm[] = [
  { id: 'humor', name: 'Humor', symbol: '✦', color: '#f59e0b', isActive: true },
  { id: 'mythology', name: 'Mythology', symbol: '𓆃', color: '#a855f7', isActive: true },
  { id: 'worldbuilding', name: 'Worldbuilding', symbol: '⚛', color: '#06b6d4', isActive: true },
  { id: 'rituals', name: 'Rituals', symbol: '🕯', color: '#f43f5e', isActive: true },
  { id: 'horror', name: 'Horror', symbol: '👁', color: '#10b981', isActive: true },
  { id: 'philosophy', name: 'Philosophy', symbol: '☱', color: '#3b82f6', isActive: true },
];

const INITIAL_CHAT: ChatMessage[] = [
  {
    id: 'welcome-msg',
    role: 'assistant',
    content: 'The canvas is listening. What patterns shall we project onto the void tonight?',
    timestamp: new Date().toISOString(),
  },
];

export const useThoughtStore = create<MapState>()(
  persist(
    (set, get) => ({
      nodes: [],
      edges: [],
      realms: INITIAL_REALMS,
      chatHistory: INITIAL_CHAT,
      activeTerrain: 'the-void' as TerrainId,
      isStreaming: false,
      focusedNodeId: null,

      addNode: (nodeData) => {
        const id = `node_${crypto.randomUUID()}`;
        const newNode: ThoughtNode = { ...nodeData, id, createdAt: new Date().toISOString() };
        set((state) => ({ nodes: [...state.nodes, newNode] }));
        return id;
      },

      updateNode: (id, updates) => {
        set((state) => ({
          nodes: state.nodes.map((n) => (n.id === id ? { ...n, ...updates } : n)),
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

        // EXPO_PUBLIC_API_URL must point to the deployed Vercel domain, e.g. https://your-app.vercel.app
        const baseUrl = process.env.EXPO_PUBLIC_API_URL ?? '';

        const makeRequest = () =>
          fetch(`${baseUrl}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: history }),
          });

        try {
          let res: Response;
          try {
            res = await makeRequest();
          } catch {
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

          if (!res.ok || !res.body) {
            let apiErr = `API error: ${res.status}`;
            try {
              const body = await res.json();
              if (body.error) apiErr = body.error;
            } catch { /* ignore */ }
            throw new Error(apiErr);
          }

          const reader = res.body.getReader();
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += new TextDecoder().decode(value);
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
              } catch { /* skip malformed SSE */ }
            }
          }
        } catch (err) {
          const errorText = err instanceof Error ? err.message : 'Something went wrong';
          set((state) => ({
            chatHistory: state.chatHistory.map((m) =>
              m.id === assistantId ? { ...m, content: `⚠ ${errorText}` } : m
            ),
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
      name: 'thought-map-mobile-storage',
      storage: createJSONStorage(() => AsyncStorage),
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
