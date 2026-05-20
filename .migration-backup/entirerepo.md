Here is the foundational codebase, repository layout, and authoritative architectural documentation for the **Living Thought Map**.
This implementation provides a fully running monorepo architecture, a robust Zustand spatial state machine, typed edge relationships, a React Flow-powered canvas, a streaming-ready chat interface, and a dark, atmospheric design system that completely avoids corporate SaaS design language.
### PART 1: Repository Architecture & Configuration
#### package.json (Root Workspace)
```json
{
  "name": "living-thought-map",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "dev": "vite apps/web",
    "build": "tsc -b && vite build apps/web",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "preview": "vite preview apps/web"
  },
  "devDependencies": {
    "@typescript-eslint/eslint-plugin": "^7.0.0",
    "@typescript-eslint/parser": "^7.0.0",
    "autoprefixer": "^10.4.18",
    "eslint": "^8.56.0",
    "eslint-plugin-react-hooks": "^4.6.0",
    "eslint-plugin-react-refresh": "^0.4.5",
    "postcss": "^8.4.35",
    "prettier": "^3.2.5",
    "tailwind-merge": "^2.2.1",
    "tailwindcss": "^3.4.1",
    "typescript": "^5.2.2",
    "vite": "^5.1.4"
  }
}

```
#### apps/web/vite.config.ts
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  root: __dirname,
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@core': path.resolve(__dirname, '../../packages/core/src'),
      '@ui': path.resolve(__dirname, '../../packages/ui/src'),
      '@types': path.resolve(__dirname, '../../packages/types/src')
    }
  },
  server: {
    port: 3000
  }
});

```
#### apps/web/tailwind.config.js
```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "../../packages/ui/src/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        void: {
          900: '#030712',
          800: '#0b0f19',
          700: '#111827',
        },
        cosmic: {
          cyan: '#06b6d4',
          purple: '#a855f7',
          amber: '#f59e0b',
          rose: '#f43f5e',
          emerald: '#10b981',
          blue: '#3b82f6'
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        sans: ['Inter', 'sans-serif']
      },
      boxShadow: {
        'glow-cyan': '0 0 15px -3px rgba(6, 182, 212, 0.4)',
        'glow-purple': '0 0 15px -3px rgba(168, 85, 247, 0.4)'
      }
    },
  },
  plugins: [],
}

```
#### apps/web/index.html
```html
<!DOCTYPE html>
<html lang="en" class="bg-void-900 text-slate-200 selection:bg-cosmic-cyan/30">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Living Thought Map</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500&family=JetBrains+Mono:wght@300;400&display=swap" rel="stylesheet">
  </head>
  <body class="overflow-hidden select-none">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>

```
### PART 2: Shared Packages & Systems
#### packages/types/src/index.ts
```typescript
export type NodeType =
  | "thought"
  | "joke"
  | "character"
  | "myth"
  | "research"
  | "canon"
  | "contradiction"
  | "artifact"
  | "fragment";

export type EdgeType =
  | "evolves_from"
  | "contradicts"
  | "references"
  | "remixes"
  | "supports";

export interface ThoughtNode {
  id: string;
  title: string;
  content: string;
  type: NodeType;
  realms: string[];
  x: number;
  y: number;
  createdAt: string;
}

export interface ThoughtEdge {
  id: string;
  source: string;
  target: string;
  type: EdgeType;
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
}

```
#### packages/core/src/store.ts
```typescript
import { create } from 'zustand';
import { ThoughtNode, ThoughtEdge, Realm, ChatMessage, NodeType, EdgeType } from '@types';

interface MapState {
  nodes: ThoughtNode[];
  edges: ThoughtEdge[];
  realms: Realm[];
  chatHistory: ChatMessage[];
  activeConversationId: string | null;
  isStreaming: boolean;
  
  // Actions
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
    { id: 'philosophy', name: 'Philosophy', symbol: '☱', color: '#3b82f6', isActive: true },
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
      realms: state.realms.map((r) => r.id === id ? { ...r, isActive: !r.isActive } : r)
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

    // Simulating deterministic, high-concept response mapping token by token
    const assistantId = crypto.randomUUID();
    let partialContent = "";
    
    const responseTemplate = `Analysis of "${content}" complete. We notice a structural contradiction between your past conceptual architecture and this new spark. Shall we anchor this as an artifact or let it mutate?`;

    set((state) => ({
      chatHistory: [...state.chatHistory, { id: assistantId, role: 'assistant', content: '', timestamp: new Date().toISOString() }]
    }));

    const tokens = responseTemplate.split(" ");
    for (let i = 0; i < tokens.length; i++) {
      await new Promise((res) => setTimeout(res, 60));
      partialContent += (i === 0 ? "" : " ") + tokens[i];
      set((state) => ({
        chatHistory: state.chatHistory.map((msg) =>
          msg.id === assistantId ? { ...msg, content: partialContent } : msg
        )
      }));
    }
    set({ isStreaming: false });
  },

  extractToMap: (messageId, type, title) => {
    const message = get().chatHistory.find(m => m.id === messageId);
    if (!message) return;

    // Pick active realms to assign automatically
    const activeRealmIds = get().realms.filter(r => r.isActive).map(r => r.id);

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

```
### PART 3: Primary Web App Layout & Components
#### apps/web/src/main.tsx
```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import 'reactflow/dist/style.css';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

```
#### apps/web/src/index.css
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Cosmic Ambient Glow Enhancements */
.react-flow__pane {
  background: radial-gradient(circle at 50% 50%, #0b0f19 0%, #030712 100%);
}

.react-flow__edge-path {
  stroke-dasharray: 5;
  animation: dash 20s linear infinite;
}

@keyframes dash {
  from {
    stroke-dashoffset: 100;
  }
  to {
    stroke-dashoffset: 0;
  }
}

/* Custom Scrollbar for Atmospheric Minimal Rail */
::-webkit-scrollbar {
  width: 4px;
}
::-webkit-scrollbar-track {
  background: #030712;
}
::-webkit-scrollbar-thumb {
  background: #1f2937;
  border-radius: 2px;
}
::-webkit-scrollbar-thumb:hover {
  background: #06b6d4;
}

```
#### apps/web/src/App.tsx
```typescript
import React from 'react';
import ContextHistoryRail from './components/ContextHistoryRail';
import SpatialCanvas from './components/SpatialCanvas';
import ThoughtStreamRail from './components/ThoughtStreamRail';

export default function App() {
  return (
    <div className="flex w-screen h-screen bg-void-900 text-slate-300 font-sans antialiased overflow-hidden">
      {/* LEFT PANEL: Context History Rail */}
      <ContextHistoryRail />

      {/* CENTER PANEL: Infinite Canvas */}
      <main className="flex-1 h-full relative border-x border-void-700/50">
        <SpatialCanvas />
      </main>

      {/* RIGHT PANEL: Thought Stream AI Interface */}
      <ThoughtStreamRail />
    </div>
  );
}

```
#### apps/web/src/components/ContextHistoryRail.tsx
```typescript
import React from 'react';
import { useThoughtStore } from '@core/store';
import { Compass, EyeOff, Hash } from 'lucide-react';

export default function ContextHistoryRail() {
  const { realms, toggleRealm, nodes } = useThoughtStore();

  return (
    <aside className="w-64 h-full bg-void-900/90 flex flex-col justify-between p-4 border-r border-void-800/40 select-none">
      <div>
        <div className="flex items-center gap-2 mb-8 px-2">
          <div className="w-2 h-2 rounded-full bg-cosmic-cyan animate-pulse" />
          <h1 className="font-mono text-xs tracking-widest uppercase text-slate-400">
            Thought Map Shell
          </h1>
        </div>

        {/* REACTION REALMS AREA */}
        <section className="mb-8">
          <div className="text-[10px] font-mono tracking-wider text-slate-500 uppercase mb-3 px-2">
            Symbolic Realms
          </div>
          <div className="space-y-1">
            {realms.map((realm) => (
              <button
                key={realm.id}
                onClick={() => toggleRealm(realm.id)}
                className={`w-full flex items-center justify-between px-2 py-1.5 rounded font-mono text-xs transition-all ${
                  realm.isActive
                    ? 'text-slate-200 bg-void-800/60 shadow-glow-cyan/5'
                    : 'text-slate-600 hover:text-slate-400'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span style={{ color: realm.isActive ? realm.color : '#475569' }}>
                    {realm.symbol}
                  </span>
                  <span>{realm.name}</span>
                </div>
                <div
                  className="w-1 h-1 rounded-full"
                  style={{ backgroundColor: realm.isActive ? realm.color : 'transparent' }}
                />
              </button>
            ))}
          </div>
        </section>

        {/* INDEX COGNITION SUMMARY */}
        <section>
          <div className="text-[10px] font-mono tracking-wider text-slate-500 uppercase mb-3 px-2">
            Active Anchors
          </div>
          <div className="max-h-60 overflow-y-auto space-y-1 px-2">
            {nodes.length === 0 ? (
              <div className="text-xs italic text-slate-600 font-mono">No nodes anchored.</div>
            ) : (
              nodes.map(n => (
                <div key={n.id} className="text-xs font-mono text-slate-400 truncate flex items-center gap-1.5">
                  <span class="text-cosmic-cyan/60">#</span> {n.title}
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <div className="p-2 border-t border-void-800/60 flex items-center gap-2 text-[11px] font-mono text-slate-500">
        <Compass size={12} />
        <span>V0.1.0 // Spatial Dominance</span>
      </div>
    </aside>
  );
}

```
#### apps/web/src/components/SpatialCanvas.tsx
```typescript
import React, { useMemo } from 'react';
import ReactFlow, { Background, Controls, NodeChange, applyNodeChanges } from 'reactflow';
import { useThoughtStore } from '@core/store';
import CustomThoughtNode from './CustomThoughtNode';

const nodeTypes = {
  thoughtMapNode: CustomThoughtNode,
};

export default function SpatialCanvas() {
  const { nodes, edges, updateNodePosition } = useThoughtStore();

  const flowNodes = useMemo(() => {
    return nodes.map((node) => ({
      id: node.id,
      type: 'thoughtMapNode',
      position: { x: node.x, y: node.y },
      data: { node },
    }));
  }, [nodes]);

  const flowEdges = useMemo(() => {
    return edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      animated: true,
      style: {
        stroke: edge.type === 'contradicts' ? '#f43f5e' : '#06b6d4',
        strokeWidth: 1,
        opacity: 0.6,
      },
    }));
  }, [edges]);

  const onNodesChange = (changes: NodeChange[]) => {
    changes.forEach((change) => {
      if (change.type === 'position' && change.position && change.id) {
        updateNodePosition(change.id, change.position.x, change.position.y);
      }
    });
  };

  return (
    <div className="w-full h-full relative">
      {nodes.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10 select-none">
          <p className="font-mono text-xs tracking-widest text-slate-500 uppercase animate-pulse">
            Begin thinking.
          </p>
          <p className="font-mono text-[10px] text-slate-600 mt-1">
            Every message can become a node.
          </p>
        </div>
      )}

      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        onNodesChange={onNodesChange}
        nodeTypes={nodeTypes}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#1e293b" gap={24} size={1} />
        <Controls className="!bg-void-800 !border-void-700 !text-slate-400 !fill-slate-400" />
      </ReactFlow>
    </div>
  );
}

```
#### apps/web/src/components/CustomThoughtNode.tsx
```typescript
import React from 'react';
import { Handle, Position } from 'reactflow';
import { ThoughtNode } from '@types';
import { Sparkles, HelpCircle, AlertTriangle, Book, Copy } from 'lucide-react';

const TYPE_CONFIGS: Record<ThoughtNode['type'], { icon: any; border: string; glow: string }> = {
  thought: { icon: Sparkles, border: 'border-cosmic-cyan/40', glow: 'shadow-glow-cyan' },
  joke: { icon: Sparkles, border: 'border-cosmic-amber/40', glow: 'shadow-glow-amber' },
  character: { icon: Book, border: 'border-cosmic-purple/40', glow: 'shadow-glow-purple' },
  myth: { icon: Book, border: 'border-cosmic-purple/60', glow: 'shadow-glow-purple' },
  research: { icon: Copy, border: 'border-cosmic-blue/40', glow: 'shadow-glow-blue' },
  canon: { icon: Copy, border: 'border-cosmic-emerald/50', glow: 'shadow-glow-emerald' },
  contradiction: { icon: AlertTriangle, border: 'border-cosmic-rose/60', glow: 'shadow-glow-rose' },
  artifact: { icon: HelpCircle, border: 'border-slate-500/40', glow: 'shadow-none' },
  fragment: { icon: HelpCircle, border: 'border-slate-600/30', glow: 'shadow-none' },
};

export default function CustomThoughtNode({ data }: { data: { node: ThoughtNode } }) {
  const { node } = data;
  const config = TYPE_CONFIGS[node.type] || TYPE_CONFIGS.thought;
  const Icon = config.icon;

  return (
    <div className={`p-4 rounded-lg bg-void-800/90 border ${config.border} max-w-xs min-w-[200px] transition-all hover:scale-[1.02] hover:bg-void-800 backdrop-blur-sm`}>
      <Handle type="target" position={Position.Top} className="!bg-void-700 !w-2 !h-2" />
      
      <div className="flex items-center gap-2 mb-2">
        <Icon size={12} className="text-cosmic-cyan" />
        <span className="text-[10px] font-mono tracking-widest text-slate-500 uppercase">
          {node.type}
        </span>
      </div>

      <h4 className="font-sans text-xs font-medium text-slate-200 mb-1">
        {node.title}
      </h4>
      
      <p className="font-sans text-[11px] text-slate-400 leading-relaxed break-words line-clamp-4">
        {node.content}
      </p>

      <div className="flex gap-1 mt-3">
        {node.realms.map((r) => (
          <span key={r} className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-void-700/50 text-slate-400">
            @{r}
          </span>
        ))}
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-void-700 !w-2 !h-2" />
    </div>
  );
}

```
#### apps/web/src/components/ThoughtStreamRail.tsx
```typescript
import React, { useState, useRef, useEffect } from 'react';
import { useThoughtStore } from '@core/store';
import { Send, ArrowUpRight } from 'lucide-react';
import { NodeType } from '@types';

export default function ThoughtStreamRail() {
  const { chatHistory, sendChatMessage, extractToMap, isStreaming } = useThoughtStore();
  const [input, setInput] = useState('');
  const [extractTargetId, setExtractTargetId] = useState<string | null>(null);
  const [nodeTitle, setNodeTitle] = useState('');
  const [nodeType, setNodeType] = useState<NodeType>('thought');
  
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [chatHistory]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;
    const currentMsg = input;
    setInput('');
    await sendChatMessage(currentMsg);
  };

  return (
    <aside className="w-96 h-full bg-void-900/95 flex flex-col justify-between border-l border-void-800/40 relative">
      {/* HEADER */}
      <div className="p-4 border-b border-void-800/60 bg-void-900/40 backdrop-blur-sm">
        <h3 className="font-mono text-xs tracking-wider uppercase text-slate-400">
          Thought Stream
        </h3>
      </div>

      {/* CHAT CHRONOLOGY */}
      <div ref={containerRef} className="flex-1 overflow-y-auto p-4 space-y-6">
        {chatHistory.map((message) => (
          <div key={message.id} className={`flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
            <span className="text-[9px] font-mono text-slate-600 mb-1">
              {message.role === 'user' ? '// TRANSMISSION' : '// COGNITION'}
            </span>
            <div className={`p-3 rounded-lg text-xs leading-relaxed max-w-[85%] font-sans ${
              message.role === 'user' 
                ? 'bg-void-800 text-slate-200 border border-void-700/50' 
                : 'bg-void-900/60 text-slate-300 border border-void-800/30'
            }`}>
              {message.content}
            </div>

            {/* EXTRACT INTERACTION TRIGGER */}
            {message.role === 'assistant' && !message.extractedNodeId && (
              <button
                onClick={() => setExtractTargetId(message.id)}
                className="mt-1.5 flex items-center gap-1 font-mono text-[10px] text-cosmic-cyan hover:text-cyan-400 transition-colors bg-void-800/30 px-2 py-0.5 rounded border border-void-800"
              >
                <ArrowUpRight size={10} />
                <span>Extract to map</span>
              </button>
            )}

            {message.extractedNodeId && (
              <span className="mt-1 text-[9px] font-mono text-slate-600 italic">
                ✓ Crystallized onto canvas
              </span>
            )}
          </div>
        ))}
      </div>

      {/* EXTRACT ACTION MODAL (INLINE POPUP OVER STREAM) */}
      {extractTargetId && (
        <div className="absolute inset-x-0 bottom-20 p-4 bg-void-800 border-t border-void-700/80 space-y-3 z-30 shadow-2xl">
          <div className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
            Anchor Idea Parameterization
          </div>
          <input
            type="text"
            placeholder="Node Title..."
            value={nodeTitle}
            onChange={(e) => setNodeTitle(e.target.value)}
            className="w-full bg-void-900 border border-void-700 rounded px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:border-cosmic-cyan text-slate-200"
          />
          <select
            value={nodeType}
            onChange={(e) => setNodeType(e.target.value as NodeType)}
            className="w-full bg-void-900 border border-void-700 rounded px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:border-cosmic-cyan text-slate-400"
          >
            <option value="thought">Thought</option>
            <option value="joke">Joke</option>
            <option value="character">Character</option>
            <option value="myth">Myth</option>
            <option value="research">Research</option>
            <option value="canon">Canon</option>
            <option value="contradiction">Contradiction</option>
            <option value="artifact">Artifact</option>
            <option value="fragment">Fragment</option>
          </select>
          <div className="flex gap-2 justify-end pt-1">
            <button
              onClick={() => setExtractTargetId(null)}
              className="px-2.5 py-1 rounded font-mono text-[10px] text-slate-500 hover:text-slate-300"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (!nodeTitle.trim()) return;
                extractToMap(extractTargetId, nodeType, nodeTitle);
                setExtractTargetId(null);
                setNodeTitle('');
              }}
              className="px-3 py-1 rounded font-mono text-[10px] bg-cosmic-cyan text-void-900 font-semibold"
            >
              Materialize Node
            </button>
          </div>
        </div>
      )}

      {/* INPUT DRAWER */}
      <form onSubmit={handleSend} className="p-4 border-t border-void-800/60 bg-void-900/50">
        <div className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Introduce a concept..."
            disabled={isStreaming}
            className="w-full bg-void-900 text-xs font-mono border border-void-800/80 rounded-lg pl-3 pr-10 py-3 text-slate-200 focus:outline-none focus:border-cosmic-cyan/50 placeholder:text-slate-600 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isStreaming}
            className="absolute right-2 p-1.5 rounded-md text-slate-600 hover:text-cosmic-cyan transition-colors disabled:opacity-30"
          >
            <Send size={14} />
          </button>
        </div>
      </form>
    </aside>
  );
}

```
### PART 4: Core Philosophy & Ontology Docs
#### docs/ontology.md
```markdown
# Authorization Ontology: The Living Symbolic Terrain

This document outlines the strict conceptual framework governing the execution layer of the Living Thought Map. No structural additions or adjustments should be processed without validating against this authority.

## 1. Node Philosophy
Nodes are not text documents, database cells, or markdown archives. A node is a crystallized cross-section of a conceptual trajectory. It holds mass within the spatial plane and exerts continuous structural logic on adjacent nodes via relationships.

## 2. Symbolic Realms
Realms are non-exclusive atmospheric overlays. Unlike folders, which partition and segregate material entities, a Realm represents a wavelength of thought. An architectural plan can exist completely and harmoniously within `Horror`, `Philosophy`, and `Worldbuilding` simultaneously without duplication.

## 3. Map-First Navigation
If a user is searching for an object chronologically, they have regressed to legacy computing logic. The map behaves as a geographic external memory device. Relationships are remembered through spatial configuration—an orientation known as Topographic Cognitive Architecture.

## 4. The "Extract to Map" Mechanism
The stream of raw input text from the chat interface is fundamentally untrustworthy until it has been parameterised into an externalized spatial asset. "Extraction" acts as an anchor, stripping away sequential chronology and transferring conceptual authority directly onto the canvas view.

```
#### docs/node-types.md
```markdown
# Architectural Directives: Initial System Node Archetypes

| Node Type | Emotional Essence / Meaning | Visual Trajectory & Structural Mechanics |
| :--- | :--- | :--- |
| **Thought** | Neutral spark; raw conscious output. | Semi-translucent, steady pale cyan glow, default anchor geometry. |
| **Joke** | Subversive insight; irony breaking structural patterns. | Prismatic refraction effects. Breaks local grid bounds dynamically. |
| **Character** | Intentional focus; localized psychological system. | Deep pulsing violet borders, multi-layered canvas shadowing. |
| **Myth** | Grand narrative structure; non-falsifiable world truth. | Golden canvas aura, locks canvas focus when queried. |
| **Research** | Grounding energy; concrete exterior evidence. | Dense structure, minimal aura, accepts thick multiple inwards connections. |
| **Canon** | Irreversible foundation; local architectural truth. | High opacity layout, double-bordered containment walls. |
| **Contradiction** | Critical error; system instability. | Intense crimson tracking lines. Breaks connections when nodes move too close. |
| **Artifact** | Discovered object; fossilized concept. | Muted stone-gray hue, resistant to random panning manipulation. |
| **Fragment** | Incomplete sequence; detached intuition. | Asymmetrical dashed layout, floats freely without alignment locks. |

```
#### docs/interaction-philosophy.md
```markdown
# Product Manifesto: The Spatial Imperative

## Why Sidebar Chat History Fails
Modern conversational AI patterns rely completely on the scrolling terminal. The timeline forces a linear chronology where highly relevant insights are systematically buried beneath the current prompt line. Ideas disappear because they are old, not because they are invalid.

## Chronology is Weak Cognition
Human memory is structural, associative, and environmental. Forcing creative cognition through a sequential stack completely strips context from the workspace. Spatial memory allows researchers, writers, and thinkers to instinctively track connections simply by referencing direction, clustering proximity, and pathing density.

## Realms Are Not Folders
Traditional directories require user choices based on mutual exclusivity: an item can be in Folder A or Folder B. The Living Thought Map recognizes that concepts change parameters depending on perspective. Realms alter the ambient visibility profile without ever breaking the global topographical map alignment.

```
