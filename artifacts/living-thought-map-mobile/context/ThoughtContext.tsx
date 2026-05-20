import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

export type NodeType =
  | "thought" | "joke" | "character" | "myth"
  | "research" | "canon" | "contradiction" | "artifact" | "fragment";

export interface ThoughtNode {
  id: string;
  title: string;
  content: string;
  type: NodeType;
  realms: string[];
  createdAt: string;
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
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  extractedNodeId?: string;
}

export type TerrainId =
  | "memory-palace" | "interstellar-plane" | "terrestrial-globe"
  | "mythic-landscape" | "the-void";

const INITIAL_REALMS: Realm[] = [
  { id: "humor", name: "Humor", symbol: "✦", color: "#f59e0b", isActive: true },
  { id: "mythology", name: "Mythology", symbol: "𓆃", color: "#a855f7", isActive: true },
  { id: "worldbuilding", name: "Worldbuilding", symbol: "⚛", color: "#06b6d4", isActive: true },
  { id: "rituals", name: "Rituals", symbol: "▲", color: "#f43f5e", isActive: true },
  { id: "horror", name: "Horror", symbol: "◉", color: "#10b981", isActive: true },
  { id: "philosophy", name: "Philosophy", symbol: "☱", color: "#3b82f6", isActive: true },
];

const INITIAL_CHAT: ChatMessage[] = [
  {
    id: "welcome-msg",
    role: "assistant",
    content: "The canvas is listening. What patterns shall we project onto the void tonight?",
    timestamp: new Date().toISOString(),
  },
];

const STORAGE_KEY = "thought-map-mobile-v1";

interface ThoughtContextValue {
  nodes: ThoughtNode[];
  realms: Realm[];
  chatHistory: ChatMessage[];
  activeTerrain: TerrainId;
  isStreaming: boolean;
  addNode: (node: Omit<ThoughtNode, "id" | "createdAt">) => string;
  updateNode: (id: string, updates: Partial<Pick<ThoughtNode, "title" | "content" | "type" | "realms">>) => void;
  deleteNode: (id: string) => void;
  toggleRealm: (id: string) => void;
  sendChatMessage: (content: string) => Promise<void>;
  extractToMap: (messageId: string, type: NodeType, title: string, realmId?: string) => void;
  setTerrain: (id: TerrainId) => void;
}

const ThoughtContext = createContext<ThoughtContextValue | null>(null);

let msgCounter = 0;
function genId(): string {
  msgCounter++;
  return `msg-${Date.now()}-${msgCounter}-${Math.random().toString(36).substr(2, 9)}`;
}

export function ThoughtProvider({ children }: { children: React.ReactNode }) {
  const [nodes, setNodes] = useState<ThoughtNode[]>([]);
  const [realms, setRealms] = useState<Realm[]>(INITIAL_REALMS);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>(INITIAL_CHAT);
  const [activeTerrain, setActiveTerrain] = useState<TerrainId>("the-void");
  const [isStreaming, setIsStreaming] = useState(false);
  const initializedRef = useRef(false);

  // Load persisted state on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (initializedRef.current) return;
      try {
        if (raw) {
          const saved = JSON.parse(raw);
          if (saved.nodes) setNodes(saved.nodes);
          if (saved.realms) setRealms(saved.realms);
          if (saved.chatHistory) setChatHistory(saved.chatHistory);
          if (saved.activeTerrain) setActiveTerrain(saved.activeTerrain);
        }
      } catch { /* ignore corrupt data */ } finally {
        initializedRef.current = true;
      }
    });
  }, []);

  const persist = useCallback((n: ThoughtNode[], r: Realm[], c: ChatMessage[], t: TerrainId) => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ nodes: n, realms: r, chatHistory: c, activeTerrain: t })).catch(() => {});
  }, []);

  const addNode = useCallback((nodeData: Omit<ThoughtNode, "id" | "createdAt">) => {
    const id = `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newNode: ThoughtNode = { ...nodeData, id, createdAt: new Date().toISOString() };
    setNodes((prev) => {
      const next = [...prev, newNode];
      return next;
    });
    return id;
  }, []);

  const updateNode = useCallback((id: string, updates: Partial<Pick<ThoughtNode, "title" | "content" | "type" | "realms">>) => {
    setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, ...updates } : n)));
  }, []);

  const deleteNode = useCallback((id: string) => {
    setNodes((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const toggleRealm = useCallback((id: string) => {
    setRealms((prev) => prev.map((r) => (r.id === id ? { ...r, isActive: !r.isActive } : r)));
  }, []);

  const sendChatMessage = useCallback(async (content: string) => {
    const userMsg: ChatMessage = { id: genId(), role: "user", content, timestamp: new Date().toISOString() };
    const assistantId = genId();
    const assistantMsg: ChatMessage = { id: assistantId, role: "assistant", content: "", timestamp: new Date().toISOString() };

    // Capture history BEFORE state update (stale closure prevention)
    const historyForRequest = chatHistory.map((m) => ({ role: m.role, content: m.content }));
    historyForRequest.push({ role: "user", content });

    setChatHistory((prev) => [...prev, userMsg, assistantMsg]);
    setIsStreaming(true);

    try {
      // @ts-ignore — expo/fetch types not available at compile time
      const { fetch: expoFetch } = await import("expo/fetch");
      const domain = process.env.EXPO_PUBLIC_DOMAIN;
      const baseUrl = domain ? `https://${domain}/` : "/";

      const response = await expoFetch(`${baseUrl}api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        body: JSON.stringify({ messages: historyForRequest }),
      });

      if (!response.ok) throw new Error(`API error: ${response.status}`);

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (raw === "[DONE]") continue;
          try {
            const token = JSON.parse(raw).choices?.[0]?.delta?.content ?? "";
            if (token) {
              setChatHistory((prev) => {
                const updated = [...prev];
                const idx = updated.findLastIndex((m) => m.id === assistantId);
                if (idx !== -1) updated[idx] = { ...updated[idx], content: updated[idx].content + token };
                return updated;
              });
            }
          } catch { /* skip malformed SSE */ }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setChatHistory((prev) => prev.map((m) => (m.id === assistantId ? { ...m, content: `⚠ ${msg}` } : m)));
    } finally {
      setIsStreaming(false);
    }
  }, [chatHistory]);

  const extractToMap = useCallback((messageId: string, type: NodeType, title: string, realmId?: string) => {
    const message = chatHistory.find((m) => m.id === messageId);
    if (!message) return;
    const id = `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newNode: ThoughtNode = {
      id, title, content: message.content, type,
      realms: realmId ? [realmId] : [],
      createdAt: new Date().toISOString(),
    };
    setNodes((prev) => [...prev, newNode]);
    setChatHistory((prev) => prev.map((m) => (m.id === messageId ? { ...m, extractedNodeId: id } : m)));
  }, [chatHistory]);

  const setTerrain = useCallback((id: TerrainId) => setActiveTerrain(id), []);

  // Persist whenever state changes
  useEffect(() => {
    if (initializedRef.current) persist(nodes, realms, chatHistory, activeTerrain);
  }, [nodes, realms, chatHistory, activeTerrain, persist]);

  return (
    <ThoughtContext.Provider value={{ nodes, realms, chatHistory, activeTerrain, isStreaming, addNode, updateNode, deleteNode, toggleRealm, sendChatMessage, extractToMap, setTerrain }}>
      {children}
    </ThoughtContext.Provider>
  );
}

export function useThought() {
  const ctx = useContext(ThoughtContext);
  if (!ctx) throw new Error("useThought must be used within ThoughtProvider");
  return ctx;
}
