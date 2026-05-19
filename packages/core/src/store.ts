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

    set((state) => ({
      chatHistory: [...state.chatHistory, userMsg],
      isStreaming: true
    }));

    const assistantId = crypto.randomUUID();
    let partialContent = '';

    const responseTemplate = `Analysis of "${content}" complete. We notice a structural contradiction between your past conceptual architecture and this new spark. Shall we anchor this as an artifact or let it mutate?`;

    set((state) => ({
      chatHistory: [...state.chatHistory, { id: assistantId, role: 'assistant', content: '', timestamp: new Date().toISOString() }]
    }));

    const tokens = responseTemplate.split(' ');
    for (let i = 0; i < tokens.length; i += 1) {
      await new Promise((res) => setTimeout(res, 60));
      partialContent += (i === 0 ? '' : ' ') + tokens[i];
      set((state) => ({
        chatHistory: state.chatHistory.map((msg) =>
          msg.id === assistantId ? { ...msg, content: partialContent } : msg
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
