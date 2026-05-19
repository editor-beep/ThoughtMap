import { create } from 'zustand';
import { ThoughtNode, ThoughtEdge, Realm, ChatMessage, NodeType, EdgeType } from '@types';

interface MapState {
  nodes: ThoughtNode[];
  edges: ThoughtEdge[];
  realms: Realm[];
  chatHistory: ChatMessage[];
  activeConversationId: string | null;
  isStreaming: boolean;

  addNode: (node: Omit<ThoughtNode, 'id' | 'createdAt'>) => string;
  updateNodePosition: (id: string, x: number, y: number) => void;
  addEdge: (source: string, target: string, type: EdgeType) => void;
  toggleRealm: (id: string) => void;
  sendChatMessage: (content: string) => Promise<void>;
  extractToMap: (messageId: string, type: NodeType, title: string) => void;
}

export const useThoughtStore = create<MapState>((set, get) => ({
  nodes: [],
  edges: [],
  realms: [
    { id: 'humor', name: 'Humor', symbol: '✦', color: '#f59e0b', isActive: true },
    { id: 'mythology', name: 'Mythology', symbol: '𓆃', color: '#a855f7', isActive: true },
    { id: 'worldbuilding', name: 'Worldbuilding', symbol: '⚛', color: '#06b6d4', isActive: true },
    { id: 'rituals', name: 'Rituals', symbol: '🕯', color: '#f43f5e', isActive: true },
    { id: 'horror', name: 'Horror', symbol: '👁', color: '#10b981', isActive: true },
    { id: 'philosophy', name: 'Philosophy', symbol: '☱', color: '#3b82f6', isActive: true }
  ],
  chatHistory: [
    {
      id: 'welcome-msg',
      role: 'assistant',
      content: 'The canvas is listening. What patterns shall we project onto the void tonight?',
      timestamp: new Date().toISOString()
    }
  ],
  activeConversationId: 'default',
  isStreaming: false,

  addNode: (nodeData) => {
    const id = `node_${crypto.randomUUID()}`;
    const newNode: ThoughtNode = {
      ...nodeData,
      id,
      createdAt: new Date().toISOString()
    };
    set((state) => ({ nodes: [...state.nodes, newNode] }));
    return id;
  },

  updateNodePosition: (id, x, y) => {
    set((state) => ({
      nodes: state.nodes.map((node) => (node.id === id ? { ...node, x, y } : node))
    }));
  },

  addEdge: (source, target, type) => {
    const id = `edge_${crypto.randomUUID()}`;
    set((state) => ({
      edges: [...state.edges, { id, source, target, type }]
    }));
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
        body: JSON.stringify({ messages: history })
      });

      if (!res.ok || !res.body) {
        throw new Error(`API error: ${res.status}`);
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
      const errorText = err instanceof Error ? err.message : 'Connection failed';
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
      .realms
      .filter((r) => r.isActive)
      .map((r) => r.id);

    const nodeId = get().addNode({
      title,
      content: message.content,
      type,
      realms: activeRealmIds.length ? [activeRealmIds[0]] : ['philosophy'],
      x: (Math.random() - 0.5) * 300,
      y: (Math.random() - 0.5) * 300
    });

    set((state) => ({
      chatHistory: state.chatHistory.map((m) =>
        m.id === messageId ? { ...m, extractedNodeId: nodeId } : m
      )
    }));
  }
}));
