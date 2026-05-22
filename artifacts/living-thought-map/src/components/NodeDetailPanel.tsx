import React, { useState, useRef, useEffect } from 'react';
import {
  X, Send, Edit3, MessageSquare, Link2,
  Sparkles, Smile, User, BookOpen, Microscope,
  Archive, AlertTriangle, Package, Layers, Trash2,
  type LucideIcon
} from 'lucide-react';
import { useThoughtStore } from '../store';
import { NodeType } from '../types';

const NODE_TYPE_OPTIONS: { value: NodeType; label: string }[] = [
  { value: 'thought', label: 'Thought' },
  { value: 'joke', label: 'Joke' },
  { value: 'character', label: 'Character' },
  { value: 'myth', label: 'Myth' },
  { value: 'research', label: 'Research' },
  { value: 'canon', label: 'Canon' },
  { value: 'contradiction', label: 'Contradiction' },
  { value: 'artifact', label: 'Artifact' },
  { value: 'fragment', label: 'Fragment' },
];

const EDGE_LABELS: Record<string, string> = {
  evolves_from: 'evolves from', contradicts: 'contradicts',
  references: 'references', remixes: 'remixes', supports: 'supports',
};

const EDGE_COLORS: Record<string, string> = {
  evolves_from: '#06b6d4', contradicts: '#f43f5e',
  references: '#3b82f6', remixes: '#a855f7', supports: '#10b981',
};

const TYPE_ICONS: Record<NodeType, LucideIcon> = {
  thought: Sparkles, joke: Smile, character: User, myth: BookOpen,
  research: Microscope, canon: Archive, contradiction: AlertTriangle,
  artifact: Package, fragment: Layers,
};

const TYPE_COLORS: Record<NodeType, string> = {
  thought: '#06b6d4', joke: '#f59e0b', character: '#a855f7', myth: '#a855f7',
  research: '#3b82f6', canon: '#10b981', contradiction: '#f43f5e',
  artifact: '#64748b', fragment: '#475569',
};

type Tab = 'chat' | 'edit' | 'links';

interface Props {
  nodeId: string | null;
  onClose: () => void;
}

export default function NodeDetailPanel({ nodeId, onClose }: Props) {
  const {
    nodes, realms, edges, updateNode, deleteNode, deleteEdge,
    nodeChats, nodeChatStreaming, sendNodeChatMessage,
  } = useThoughtStore();

  const node = nodes.find((n) => n.id === nodeId) ?? null;

  const [tab, setTab] = useState<Tab>('chat');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [nodeType, setNodeType] = useState<NodeType>('thought');
  const [chatInput, setChatInput] = useState('');
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (node) {
      setTitle(node.title);
      setContent(node.content);
      setNodeType(node.type);
    }
    setTab('chat');
    setChatInput('');
  }, [node?.id]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [nodeChats]);

  if (!node) return null;

  const Icon = TYPE_ICONS[node.type] ?? Sparkles;
  const typeColor = TYPE_COLORS[node.type] ?? '#06b6d4';
  const chat = nodeChats[node.id] ?? [];
  const isStreaming = nodeChatStreaming === node.id;
  const nodeEdges = edges.filter((e) => e.source === node.id || e.target === node.id);
  const realmMap = Object.fromEntries(realms.map((r) => [r.id, r]));

  const handleSave = () => {
    updateNode(node.id, {
      title: title.trim() || node.title,
      content,
      type: nodeType,
    });
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isStreaming) return;
    const msg = chatInput;
    setChatInput('');
    chatInputRef.current?.focus();
    await sendNodeChatMessage(node.id, node.title, node.content, msg);
  };

  const tabs: [Tab, string, LucideIcon][] = [
    ['chat', 'Chat', MessageSquare],
    ['edit', 'Edit', Edit3],
    ['links', `Links${nodeEdges.length ? ` (${nodeEdges.length})` : ''}`, Link2],
  ];

  return (
    <div className="absolute right-0 top-0 h-full w-[380px] bg-void-900/98 border-l border-void-700/60 flex flex-col z-30 backdrop-blur-md shadow-2xl">

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-void-800/70 flex-shrink-0">
        <div
          className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: typeColor + '22', boxShadow: `0 0 10px ${typeColor}30` }}
        >
          <Icon size={13} style={{ color: typeColor }} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-slate-100 truncate">{node.title}</h3>
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">{node.type}</span>
        </div>
        <button onClick={onClose} className="text-slate-600 hover:text-slate-300 transition-colors p-1 rounded">
          <X size={14} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-void-800/60 flex-shrink-0 bg-void-800/30">
        {tabs.map(([key, label, TabIcon]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[10px] font-mono uppercase tracking-wider transition-all border-b-2 ${
              tab === key
                ? 'border-cosmic-cyan text-cosmic-cyan bg-void-800/40'
                : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-void-800/20'
            }`}
            style={tab === key ? { textShadow: '0 0 12px rgba(6,182,212,0.6)' } : undefined}
          >
            <TabIcon size={10} />
            {label}
          </button>
        ))}
      </div>

      {/* ── Chat tab ── */}
      {tab === 'chat' && (
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {chat.length === 0 && (
              <div className="flex flex-col items-center pt-10 text-center gap-2">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: typeColor + '18', boxShadow: `0 0 20px ${typeColor}20` }}
                >
                  <Icon size={16} style={{ color: typeColor }} />
                </div>
                <p className="text-xs text-slate-500 font-mono">Ask the Navigator about</p>
                <p className="text-xs font-semibold text-slate-300">"{node.title}"</p>
                <p className="text-[10px] text-slate-600 mt-1 max-w-[220px] leading-relaxed">
                  This chat is focused on this node. Your questions and the AI's answers stay here.
                </p>
              </div>
            )}
            {chat.map((msg) => (
              <div key={msg.id} className={`flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div
                  className={`px-3 py-2 rounded-xl text-sm leading-relaxed max-w-[90%] border ${
                    msg.role === 'user'
                      ? 'bg-void-700/80 text-slate-200 border-void-600/50 rounded-tr-sm'
                      : 'bg-void-800/60 text-slate-300 rounded-tl-sm'
                  }`}
                  style={
                    msg.role === 'assistant'
                      ? { borderColor: typeColor + '30', borderLeftColor: typeColor + '70', borderLeftWidth: '2px' }
                      : undefined
                  }
                >
                  {msg.content}
                  {isStreaming && msg.role === 'assistant' && msg === chat[chat.length - 1] && (
                    <span
                      className="inline-block w-[2px] h-[13px] ml-0.5 align-middle animate-pulse"
                      style={{ backgroundColor: typeColor }}
                    />
                  )}
                </div>
              </div>
            ))}
            <div ref={chatBottomRef} />
          </div>

          <form onSubmit={handleSendChat} className="p-3 border-t border-void-800/60 flex-shrink-0">
            <div className="relative flex items-end">
              <textarea
                ref={chatInputRef}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendChat(e as unknown as React.FormEvent);
                  }
                }}
                placeholder={isStreaming ? 'Navigating…' : `Explore "${node.title}"…`}
                disabled={isStreaming}
                rows={1}
                className="w-full bg-void-800/60 text-sm border border-void-700/80 rounded-xl pl-3 pr-10 py-2.5 text-slate-200 focus:outline-none focus:border-cosmic-cyan/60 placeholder:text-slate-600 disabled:opacity-50 transition-colors resize-none overflow-hidden leading-relaxed"
                style={{ maxHeight: '96px' }}
                onInput={(e) => {
                  const el = e.currentTarget;
                  el.style.height = 'auto';
                  el.style.height = Math.min(el.scrollHeight, 96) + 'px';
                }}
              />
              <button
                type="submit"
                disabled={isStreaming || !chatInput.trim()}
                className="absolute right-2 bottom-2 p-1.5 text-slate-600 hover:text-cosmic-cyan transition-colors disabled:opacity-30"
              >
                <Send size={13} />
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Edit tab ── */}
      {tab === 'edit' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div>
            <label className="block text-[9px] font-mono uppercase tracking-widest text-slate-500 mb-1.5">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleSave}
              className="w-full bg-void-800/60 border border-void-700/80 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cosmic-cyan transition-colors"
            />
          </div>
          <div>
            <label className="block text-[9px] font-mono uppercase tracking-widest text-slate-500 mb-1.5">Content / Notes</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onBlur={handleSave}
              rows={6}
              className="w-full bg-void-800/60 border border-void-700/80 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-cosmic-cyan transition-colors resize-none leading-relaxed"
              placeholder="Add notes, context, or additional detail…"
            />
          </div>
          <div>
            <label className="block text-[9px] font-mono uppercase tracking-widest text-slate-500 mb-1.5">Type</label>
            <select
              value={nodeType}
              onChange={(e) => { setNodeType(e.target.value as NodeType); setTimeout(handleSave, 0); }}
              className="w-full bg-void-800/60 border border-void-700/80 rounded-lg px-3 py-2 text-sm text-slate-400 focus:outline-none focus:border-cosmic-cyan transition-colors"
            >
              {NODE_TYPE_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[9px] font-mono uppercase tracking-widest text-slate-500 mb-1.5">Realms</label>
            <div className="flex flex-wrap gap-1.5">
              {node.realms.map((rid) => {
                const r = realmMap[rid];
                return r ? (
                  <span
                    key={rid}
                    className="px-2 py-0.5 rounded-full text-[10px] font-mono border"
                    style={{ color: r.color, borderColor: r.color + '55', backgroundColor: r.color + '14' }}
                  >
                    {r.name}
                  </span>
                ) : null;
              })}
              {node.realms.length === 0 && (
                <span className="text-[10px] text-slate-600 font-mono italic">No realm — assign one in the canvas panel</span>
              )}
            </div>
          </div>
          <div className="pt-3 border-t border-void-800/60">
            <button
              onClick={() => { deleteNode(node.id); onClose(); }}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-cosmic-rose transition-colors"
            >
              <Trash2 size={11} />
              Delete this node
            </button>
          </div>
        </div>
      )}

      {/* ── Links tab ── */}
      {tab === 'links' && (
        <div className="flex-1 overflow-y-auto p-4">
          {nodeEdges.length === 0 ? (
            <div className="flex flex-col items-center pt-10 text-center gap-2">
              <Link2 size={24} className="text-slate-600" />
              <p className="text-xs text-slate-500 font-mono">No connections yet</p>
              <p className="text-[10px] text-slate-600 max-w-[200px] leading-relaxed mt-1">
                Drag from the handle at the bottom of any node to another node on the canvas to connect them.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {nodeEdges.map((edge) => {
                const otherId = edge.source === node.id ? edge.target : edge.source;
                const other = nodes.find((n) => n.id === otherId);
                const direction = edge.source === node.id ? 'out' : 'in';
                const edgeColor = EDGE_COLORS[edge.type] ?? '#475569';
                return (
                  <div
                    key={edge.id}
                    className="flex items-center gap-3 p-2.5 rounded-lg bg-void-800/40 border border-void-700/50 group"
                  >
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: edgeColor }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[9px] font-mono uppercase tracking-wider" style={{ color: edgeColor + 'cc' }}>
                        {direction === 'out' ? '↗ ' : '↙ '}{EDGE_LABELS[edge.type]}
                      </div>
                      <div className="text-xs text-slate-300 truncate mt-0.5">{other?.title ?? otherId}</div>
                    </div>
                    <button
                      onClick={() => deleteEdge(edge.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-600 hover:text-cosmic-rose p-1"
                    >
                      <X size={10} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
          <p className="text-[9px] text-slate-600 font-mono text-center mt-6">
            Drag a node's bottom handle → another node to add more links
          </p>
        </div>
      )}
    </div>
  );
}
