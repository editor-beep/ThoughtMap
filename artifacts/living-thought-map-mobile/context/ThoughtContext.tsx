import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@clerk/expo";
import { Linking } from "react-native";
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

export type EdgeType = "evolves_from" | "contradicts" | "references" | "remixes" | "supports";
export interface ThoughtEdge { id: string; source: string; target: string; type: EdgeType; }

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
    content: "What's on your mind? Share a thought, question, or idea and we'll map it together.",
    timestamp: new Date().toISOString(),
  },
];

const STORAGE_KEY = "thought-map-mobile-v1";

function getApiBaseUrl(): string {
  const raw = process.env.EXPO_PUBLIC_DOMAIN;
  if (!raw) return "";
  const host = raw.replace(/^https?:\/\//i, "").replace(/\/+$/, "");
  return `https://${host}`;
}

async function readJsonBody(response: { text?: () => Promise<string> }): Promise<any> {
  try {
    if (typeof response.text === "function") {
      const body = await response.text();
      if (!body) return null;
      try { return JSON.parse(body); } catch { return { error: body.slice(0, 200) }; }
    }
  } catch { /* ignore */ }
  return null;
}

interface ThoughtContextValue {
  nodes: ThoughtNode[];
  realms: Realm[];
  edges: ThoughtEdge[];
  chatHistory: ChatMessage[];
  activeTerrain: TerrainId;
  isStreaming: boolean;
  paywallRequired: boolean;
  addNode: (node: Omit<ThoughtNode, "id" | "createdAt">) => string;
  updateNode: (id: string, updates: Partial<Pick<ThoughtNode, "title" | "content" | "type" | "realms">>) => void;
  deleteNode: (id: string) => void;
  toggleRealm: (id: string) => void;
  addRealm: (name: string) => string;
  addEdge: (source: string, target: string, type: EdgeType) => void;
  deleteEdge: (id: string) => void;
  sendChatMessage: (content: string) => Promise<void>;
  extractToMap: (messageId: string, type: NodeType, title: string, realmId?: string) => void;
  setTerrain: (id: TerrainId) => void;
  nodeChats: Record<string, ChatMessage[]>;
  nodeChatStreaming: string | null;
  sendNodeChatMessage: (nodeId: string, nodeTitle: string, nodeContent: string, message: string) => Promise<void>;
  clearThoughtStream: () => void;
  openSubscriptionCheckout: () => Promise<void>;
  dismissPaywall: () => void;
}

const ThoughtContext = createContext<ThoughtContextValue | null>(null);

let msgCounter = 0;
function genId(): string {
  msgCounter++;
  return `msg-${Date.now()}-${msgCounter}-${Math.random().toString(36).substr(2, 9)}`;
}

let warnedMissingDomain = false;
function getChatUrl(): string {
  const raw = process.env.EXPO_PUBLIC_DOMAIN;
  if (!raw) {
    if (!warnedMissingDomain) {
      warnedMissingDomain = true;
      console.warn(
        "[ThoughtContext] EXPO_PUBLIC_DOMAIN is not set in the bundle. " +
        "AI calls will be sent to a relative '/api/chat' URL and will likely 404. " +
        "Restart the Expo dev server so the env var is baked into the bundle.",
      );
    }
    return "/api/chat";
  }
  // Normalize: strip scheme and any trailing slash so accidental "https://host/"
  // or "host/" values don't produce malformed URLs.
  const host = raw.replace(/^https?:\/\//i, "").replace(/\/+$/, "");
  return `https://${host}/api/chat`;
}

export function ThoughtProvider({ children }: { children: React.ReactNode }) {
  const { getToken } = useAuth();
  const [nodes, setNodes] = useState<ThoughtNode[]>([]);
  const [realms, setRealms] = useState<Realm[]>(INITIAL_REALMS);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>(INITIAL_CHAT);
  const [activeTerrain, setActiveTerrain] = useState<TerrainId>("the-void");
  const [isStreaming, setIsStreaming] = useState(false);
  const [edges, setEdges] = useState<ThoughtEdge[]>([]);
  const [nodeChats, setNodeChats] = useState<Record<string, ChatMessage[]>>({});
  const [nodeChatStreaming, setNodeChatStreaming] = useState<string | null>(null);
  const [paywallRequired, setPaywallRequired] = useState(false);
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
          if (saved.edges) setEdges(saved.edges);
          if (saved.nodeChats) setNodeChats(saved.nodeChats);
        }
      } catch { /* ignore corrupt data */ } finally {
        initializedRef.current = true;
      }
    });
  }, []);

  const persist = useCallback((n: ThoughtNode[], r: Realm[], c: ChatMessage[], t: TerrainId, e: ThoughtEdge[], nc: Record<string, ChatMessage[]>) => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ nodes: n, realms: r, chatHistory: c, activeTerrain: t, edges: e, nodeChats: nc })).catch(() => {});
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
    setEdges((prev) => prev.filter((e) => e.source !== id && e.target !== id));
  }, []);

  const toggleRealm = useCallback((id: string) => {
    setRealms((prev) => prev.map((r) => (r.id === id ? { ...r, isActive: !r.isActive } : r)));
  }, []);

  const addRealm = useCallback((name: string): string => {
    const REALM_COLORS = ['#f59e0b','#a855f7','#06b6d4','#f43f5e','#10b981','#3b82f6','#ec4899','#f97316','#84cc16','#8b5cf6'];
    const REALM_SYMBOLS = ['✦','◈','⬡','◉','▲','☱','⊕','⌘','⬟','◇'];
    const trimmed = name.trim();
    const id = trimmed.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || `realm-${Date.now()}`;
    setRealms((prev) => {
      if (prev.find((r) => r.id === id)) return prev;
      const color = REALM_COLORS[prev.length % REALM_COLORS.length];
      const symbol = REALM_SYMBOLS[prev.length % REALM_SYMBOLS.length];
      return [...prev, { id, name: trimmed, symbol, color, isActive: true }];
    });
    return id;
  }, []);

  const addEdge = useCallback((source: string, target: string, type: EdgeType) => {
    const id = `edge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setEdges((prev) => [...prev, { id, source, target, type }]);
  }, []);

  const deleteEdge = useCallback((id: string) => {
    setEdges((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const sendNodeChatMessage = useCallback(async (nodeId: string, nodeTitle: string, nodeContent: string, message: string) => {
    const previousChat = nodeChats[nodeId] ?? [];
    const userMsg: ChatMessage = { id: genId(), role: "user", content: message, timestamp: new Date().toISOString() };
    const assistantId = genId();
    const assistantMsg: ChatMessage = { id: assistantId, role: "assistant", content: "", timestamp: new Date().toISOString() };

    setNodeChats((prev) => ({ ...prev, [nodeId]: [...(prev[nodeId] ?? []), userMsg, assistantMsg] }));
    setNodeChatStreaming(nodeId);

    const contextMessages = [
      { role: "user", content: `We're exploring a concept: "${nodeTitle}".${nodeContent ? ` Context: ${nodeContent}` : ""}` },
      { role: "assistant", content: `I'll focus our discussion on "${nodeTitle}". What would you like to explore?` },
      ...previousChat.map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: message },
    ];

    try {
      // @ts-ignore — expo/fetch types not available at compile time
      const { fetch: expoFetch } = await import("expo/fetch");
      const url = getChatUrl();
      console.log("[ThoughtContext] node chat → POST", url);

      const token = await getToken().catch(() => null);
      const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await expoFetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream", ...authHeaders },
        body: JSON.stringify({ messages: contextMessages }),
      });

      if (!response.ok) {
        const parsed = await readJsonBody(response);
        if (response.status === 403 && parsed?.code === "subscription_required") {
          const e: any = new Error("Subscription required");
          e._subscriptionRequired = true;
          throw e;
        }
        throw new Error(`API error ${response.status}${parsed?.error ? ` — ${parsed.error}` : ""}`);
      }
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
              setNodeChats((prev) => {
                const updated = [...(prev[nodeId] ?? [])];
                const idx = updated.findLastIndex((m) => m.id === assistantId);
                if (idx !== -1) updated[idx] = { ...updated[idx], content: updated[idx].content + token };
                return { ...prev, [nodeId]: updated };
              });
            }
          } catch { /* skip malformed SSE */ }
        }
      }
    } catch (err: any) {
      if (err?._subscriptionRequired) {
        setPaywallRequired(true);
        setNodeChats((prev) => ({
          ...prev,
          [nodeId]: (prev[nodeId] ?? []).filter((m) => m.id !== assistantId),
        }));
      } else {
        const msg = err instanceof Error ? err.message : "Something went wrong";
        setNodeChats((prev) => ({
          ...prev,
          [nodeId]: (prev[nodeId] ?? []).map((m) => (m.id === assistantId ? { ...m, content: `⚠ ${msg}` } : m)),
        }));
      }
    } finally {
      setNodeChatStreaming(null);
    }
  }, [nodeChats]);

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
      const url = getChatUrl();
      console.log("[ThoughtContext] chat → POST", url);

      const token = await getToken().catch(() => null);
      const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await expoFetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream", ...authHeaders },
        body: JSON.stringify({ messages: historyForRequest }),
      });

      if (!response.ok) {
        const parsed = await readJsonBody(response);
        if (response.status === 403 && parsed?.code === "subscription_required") {
          const e: any = new Error("Subscription required");
          e._subscriptionRequired = true;
          throw e;
        }
        throw new Error(`API error ${response.status}${parsed?.error ? ` — ${parsed.error}` : ""}`);
      }

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
    } catch (err: any) {
      if (err?._subscriptionRequired) {
        setPaywallRequired(true);
        setChatHistory((prev) => prev.filter((m) => m.id !== assistantId));
      } else {
        const msg = err instanceof Error ? err.message : "Something went wrong";
        setChatHistory((prev) => prev.map((m) => (m.id === assistantId ? { ...m, content: `⚠ ${msg}` } : m)));
      }
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

  const clearThoughtStream = useCallback(() => {
    setChatHistory(INITIAL_CHAT);
    setIsStreaming(false);
  }, []);

  const dismissPaywall = useCallback(() => setPaywallRequired(false), []);

  const openSubscriptionCheckout = useCallback(async () => {
    try {
      const base = getApiBaseUrl();
      if (!base) {
        console.warn("[ThoughtContext] EXPO_PUBLIC_DOMAIN not set, cannot open checkout");
        return;
      }
      const token = await getToken().catch(() => null);
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch(`${base}/api/subscription/checkout`, { method: "POST", headers });
      const data = await res.json();
      if (data?.url) {
        await Linking.openURL(data.url);
      }
    } catch (err) {
      console.error("[ThoughtContext] checkout error", err);
    }
  }, [getToken]);

  // Persist whenever state changes
  useEffect(() => {
    if (initializedRef.current) persist(nodes, realms, chatHistory, activeTerrain, edges, nodeChats);
  }, [nodes, realms, chatHistory, activeTerrain, edges, nodeChats, persist]);

  return (
    <ThoughtContext.Provider value={{
      nodes, realms, edges, chatHistory, activeTerrain, isStreaming, paywallRequired,
      addNode, updateNode, deleteNode, toggleRealm, addRealm,
      addEdge, deleteEdge, sendChatMessage, extractToMap, setTerrain,
      nodeChats, nodeChatStreaming, sendNodeChatMessage, clearThoughtStream,
      openSubscriptionCheckout, dismissPaywall,
    }}>
      {children}
    </ThoughtContext.Provider>
  );
}

export function useThought() {
  const ctx = useContext(ThoughtContext);
  if (!ctx) throw new Error("useThought must be used within ThoughtProvider");
  return ctx;
}
