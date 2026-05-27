import React, { useState, useRef, useEffect, useCallback } from 'react';

import { Handle, Position, useUpdateNodeInternals } from 'reactflow';
import { ThoughtNode } from '../types';
import { useThoughtStore } from '../store';
import { renderMarkdown } from '../lib/markdown';
import {
  Sparkles, Smile, User, BookOpen, Microscope,
  Archive, AlertTriangle, Package, Layers, X, ChevronDown,
  Paperclip, MessageCircle, Bold, Italic, GitBranch, Navigation, Pencil,
  type LucideIcon
} from 'lucide-react';
import { EdgeType } from '../types';
import { EDGE_TYPES } from '../lib/constants';

interface TypeConfig {
  icon: LucideIcon;
  border: string;
  iconColor: string;
  glow: string;
  dotColor: string;
  dotShape: 'circle' | 'diamond';
}

const EDGE_COLORS: Record<string, string> = {
  evolves_from: '#06b6d4',
  contradicts:  '#f43f5e',
  references:   '#3b82f6',
  remixes:      '#a855f7',
  supports:     '#10b981',
};

const TYPE_CONFIGS: Record<ThoughtNode['type'], TypeConfig> = {
  thought:       { icon: Sparkles,      border: 'border-cosmic-cyan/50',    iconColor: 'text-cosmic-cyan',    glow: 'rgba(6,182,212,0.22)',    dotColor: '#c4b5fd', dotShape: 'circle'  },
  joke:          { icon: Smile,         border: 'border-cosmic-amber/50',   iconColor: 'text-cosmic-amber',   glow: 'rgba(245,158,11,0.22)',   dotColor: '#f59e0b', dotShape: 'circle'  },
  character:     { icon: User,          border: 'border-cosmic-purple/50',  iconColor: 'text-cosmic-purple',  glow: 'rgba(168,85,247,0.22)',   dotColor: '#a855f7', dotShape: 'circle'  },
  myth:          { icon: BookOpen,      border: 'border-cosmic-purple/70',  iconColor: 'text-cosmic-purple',  glow: 'rgba(168,85,247,0.30)',   dotColor: '#e879f9', dotShape: 'circle'  },
  research:      { icon: Microscope,    border: 'border-cosmic-blue/50',    iconColor: 'text-cosmic-blue',    glow: 'rgba(59,130,246,0.22)',   dotColor: '#3b82f6', dotShape: 'circle'  },
  canon:         { icon: Archive,       border: 'border-cosmic-emerald/60', iconColor: 'text-cosmic-emerald', glow: 'rgba(16,185,129,0.22)',   dotColor: '#10b981', dotShape: 'circle'  },
  contradiction: { icon: AlertTriangle, border: 'border-cosmic-rose/70',    iconColor: 'text-cosmic-rose',    glow: 'rgba(244,63,94,0.30)',    dotColor: '#f43f5e', dotShape: 'diamond' },
  artifact:      { icon: Package,       border: 'border-slate-500/50',      iconColor: 'text-slate-400',      glow: 'rgba(100,116,139,0.18)', dotColor: '#06b6d4', dotShape: 'diamond' },
  fragment:      { icon: Layers,        border: 'border-slate-600/40',      iconColor: 'text-slate-500',      glow: 'rgba(71,85,105,0.14)',   dotColor: '#64748b', dotShape: 'circle'  }
};


// ─── Inline mini toolbar ───────────────────────────────────────────────────

function wrapSelection(
  textarea: HTMLTextAreaElement,
  value: string,
  prefix: string,
  suffix: string,
  onChange: (v: string) => void
) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selected = value.slice(start, end);
  const already = selected.startsWith(prefix) && selected.endsWith(suffix);
  const newText = already
    ? value.slice(0, start) + selected.slice(prefix.length, selected.length - suffix.length) + value.slice(end)
    : value.slice(0, start) + prefix + selected + suffix + value.slice(end);
  onChange(newText);
  requestAnimationFrame(() => {
    textarea.focus();
    const newEnd = already ? end - prefix.length - suffix.length : end + prefix.length + suffix.length;
    textarea.setSelectionRange(
      already ? start : start + prefix.length,
      newEnd
    );
  });
}

interface InlineToolbarProps {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (v: string) => void;
}

function InlineToolbar({ textareaRef, value, onChange }: InlineToolbarProps) {
  const ta = textareaRef.current;
  return (
    <div className="flex items-center gap-0.5 px-1 py-0.5 rounded bg-void-700 border border-void-600/50 shadow">
      <button
        type="button"
        title="Bold"
        onMouseDown={(e) => { e.preventDefault(); ta && wrapSelection(ta, value, '**', '**', onChange); }}
        className="p-0.5 rounded text-slate-500 hover:text-slate-200 hover:bg-void-600 transition-colors"
      >
        <Bold size={9} />
      </button>
      <button
        type="button"
        title="Italic"
        onMouseDown={(e) => { e.preventDefault(); ta && wrapSelection(ta, value, '*', '*', onChange); }}
        className="p-0.5 rounded text-slate-500 hover:text-slate-200 hover:bg-void-600 transition-colors"
      >
        <Italic size={9} />
      </button>
    </div>
  );
}

// ─── Node card ─────────────────────────────────────────────────────────────

type EmphasisState = 'default' | 'focused' | 'neighborhood' | 'background';
export default function CustomThoughtNode({ data }: { data: { node: ThoughtNode; isFocused?: boolean; emphasis?: EmphasisState; semanticCompression?: number; onRequestExpand?: (nodeId: string) => void; onOpenPanel?: (nodeId: string, tab: 'chat' | 'edit') => void } }) {
  const { node } = data;
  const isFocused = Boolean(data.isFocused);
  const { deleteNode, nodeSearchQuery, updateNode, addNode, addEdge: storeAddEdge } = useThoughtStore();
  const config = TYPE_CONFIGS[node.type] ?? TYPE_CONFIGS.thought;
  const isSearchMatch = nodeSearchQuery.length > 0 && (
    node.title.toLowerCase().includes(nodeSearchQuery) ||
    node.content.toLowerCase().includes(nodeSearchQuery)
  );
  const Icon = config.icon;
  const [isExpanded, setIsExpanded] = useState(false);
  const [isInlineEditing, setIsInlineEditing] = useState(false);
  const [inlineContent, setInlineContent] = useState(node.content);
  const [showInlineToolbar, setShowInlineToolbar] = useState(false);
  const updateNodeInternals = useUpdateNodeInternals();
  const showExpanded = isExpanded || isFocused;
  const emphasis = data.emphasis ?? 'default';
  const semanticCompression = data.semanticCompression ?? 1;

  const [menuOpen, setMenuOpen] = useState(false);
  const [branchPickerOpen, setBranchPickerOpen] = useState(false);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointerDownPosRef = useRef<{ x: number; y: number } | null>(null);

  const COLLAPSED_MIN_HEIGHT = 60;
  const inlineRef = useRef<HTMLTextAreaElement | null>(null);
  const canEditInline = true;

  // Keep inlineContent in sync with node.content when not editing
  useEffect(() => {
    if (!isInlineEditing) {
      setInlineContent(node.content);
    }
  }, [node.content, isInlineEditing]);

  const commitInline = useCallback(() => {
    setIsInlineEditing(false);
    setShowInlineToolbar(false);
    updateNode(node.id, { content: inlineContent });
  }, [node.id, inlineContent, updateNode]);

  const handleInlineKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setInlineContent(node.content); // revert
      setIsInlineEditing(false);
      setShowInlineToolbar(false);
    }
  }, [node.content]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    if (isInlineEditing) return;
    pointerDownPosRef.current = { x: e.clientX, y: e.clientY };
    longPressTimerRef.current = setTimeout(() => {
      setMenuOpen(true);
      longPressTimerRef.current = null;
    }, 500);
  }, [isInlineEditing]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!pointerDownPosRef.current || !longPressTimerRef.current) return;
    const dx = e.clientX - pointerDownPosRef.current.x;
    const dy = e.clientY - pointerDownPosRef.current.y;
    if (Math.sqrt(dx * dx + dy * dy) > 6) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
      pointerDownPosRef.current = null;
    }
  }, []);

  const handlePointerUp = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    pointerDownPosRef.current = null;
  }, []);

  const handleBranch = useCallback((edgeType: EdgeType) => {
    const newId = addNode({ title: 'New node', content: '', type: 'thought', x: node.x + 280, y: node.y + 80, realms: [] });
    storeAddEdge(node.id, newId, edgeType);
    setBranchPickerOpen(false);
    setMenuOpen(false);
  }, [node.id, node.x, node.y, addNode, storeAddEdge]);

  useEffect(() => () => { if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current); }, []);

  const hasAttachments = (node.attachments ?? []).length > 0;
  const commentCount = (node.comments ?? []).length;
  const hasTags = (node.tags ?? []).length > 0;
  const hasChildMap = Boolean(node.childMapId ?? node.subMapId);

  return (
    <div
      className={`group px-4 pt-3 pb-3 rounded-lg bg-void-800/90 border ${isSearchMatch ? 'border-cosmic-cyan' : config.border} max-w-[320px] min-w-[160px] transition-all hover:scale-[1.02] hover:bg-void-800 backdrop-blur-sm relative`}
      style={{
        boxShadow: isSearchMatch ? '0 0 0 2px rgba(6,182,212,0.5), 0 0 24px rgba(6,182,212,0.3)' : `0 0 20px ${config.glow}`,
        minHeight: `${COLLAPSED_MIN_HEIGHT}px`,
        opacity: emphasis === 'background' ? 0.22 : emphasis === 'neighborhood' ? 0.88 : 1,
        transform: `scale(${emphasis === 'focused' ? 1.08 : emphasis === 'neighborhood' ? 1.03 : 1})`,
        filter: emphasis === 'background' ? 'saturate(0.75)' : 'none',
        transition: 'opacity 160ms ease, transform 180ms ease, filter 180ms ease',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      <Handle type="target" position={Position.Top} className="!bg-void-700 !w-2 !h-2 !border-void-600" />

      {/* Header: type icon + label + caret + delete — always visible */}
      <div className="flex items-center gap-2">
        <Icon size={13} className={config.iconColor} />
        <span className="text-[10px] font-mono tracking-widest text-slate-500 uppercase flex-1">{node.type}</span>

        {/* Status badges — paperclip and comment count */}
        {hasAttachments && (
          <span title="Has attachments"><Paperclip size={9} className="text-slate-600 flex-shrink-0" /></span>
        )}
        {commentCount > 0 && (
          <span className="flex items-center gap-0.5 text-[9px] text-slate-600 flex-shrink-0" title={`${commentCount} comment${commentCount !== 1 ? 's' : ''}`}>
            <MessageCircle size={9} />
            {commentCount}
          </span>
        )}
        {hasChildMap && (
          <span title="Has sub-map"><GitBranch size={10} className="text-cosmic-cyan/80 flex-shrink-0" /></span>
        )}

        <button
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded((prev) => {
              const next = !prev;
              requestAnimationFrame(() => {
                updateNodeInternals(node.id);
              });
              return next;
            });
          }}
          className="p-0.5 rounded hover:bg-void-700 text-slate-500 hover:text-slate-300 transition-colors"
          title={showExpanded ? 'Collapse' : 'Expand'}
        >
          <ChevronDown
            size={12}
            className={`transition-transform duration-200 ease-in-out${showExpanded ? ' rotate-180' : ''}`}
          />
        </button>
        <button
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); deleteNode(node.id); }}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-void-700 text-slate-600 hover:text-cosmic-rose"
          title="Delete node"
        >
          <X size={10} />
        </button>
      </div>

      {/* Title: always visible */}
      <h4 className="font-sans text-sm font-semibold text-slate-100 mt-2 leading-snug break-words" style={{ opacity: Math.max(0.65, semanticCompression) }}>{node.title}</h4>

      {/* Collapsible body: content + realm tags + node tags */}
      <div
        className="overflow-hidden transition-all duration-200 ease-in-out"
        style={{ maxHeight: showExpanded ? '600px' : '0px', opacity: showExpanded ? 1 : 0 }}
      >
        {/* Content: inline edit mode or read mode */}
        {isInlineEditing ? (
          <div className="mt-1.5">
            {showInlineToolbar && (
              <div className="mb-1">
                <InlineToolbar
                  textareaRef={inlineRef}
                  value={inlineContent}
                  onChange={setInlineContent}
                />
              </div>
            )}
            <textarea
              ref={inlineRef}
              value={inlineContent}
              onChange={(e) => setInlineContent(e.target.value)}
              onSelect={() => {
                const ta = inlineRef.current;
                if (ta && ta.selectionStart !== ta.selectionEnd) {
                  setShowInlineToolbar(true);
                }
              }}
              onKeyDown={handleInlineKeyDown}
              onBlur={commitInline}
              rows={4}
              className="nodrag w-full bg-void-700/60 border border-void-600/60 rounded px-2 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-cosmic-cyan transition-colors resize-none leading-relaxed font-mono"
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
            <p className="text-[9px] text-slate-600 font-mono mt-0.5">Esc to cancel · click outside to save</p>
          </div>
        ) : (
          <div
            className={`nodrag mt-1.5 ${canEditInline ? 'cursor-text' : ''}`}
            onClick={(e) => {
              if (!canEditInline) return;
              e.stopPropagation();
              setIsInlineEditing(true);
              setInlineContent(node.content);
            }}
            title={canEditInline ? 'Click to edit' : undefined}
          >
            <div className="text-xs text-slate-400 leading-relaxed break-words line-clamp-4" style={{ opacity: Math.max(0, semanticCompression - 0.2) }}>
              {renderMarkdown(node.content) ?? <span className="text-slate-600 italic">No content</span>}
            </div>
          </div>
        )}

        {/* Tag chips */}
        {hasTags && (
          <div className="flex flex-wrap gap-1 mt-2">
            {(node.tags ?? []).slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-void-700/60 border border-void-600/40 text-slate-500"
              >
                {tag}
              </span>
            ))}
            {(node.tags ?? []).length > 4 && (
              <span className="text-[9px] font-mono text-slate-600">+{(node.tags ?? []).length - 4}</span>
            )}
          </div>
        )}

        {/* Realm tags */}
        <div className="flex flex-wrap gap-1 mt-2">
          {node.realms.map((r) => (
            <span key={r} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-void-700/60 text-slate-500">
              @{r}
            </span>
          ))}
        </div>
      </div>

      {/* Collapsed state badges: tags + paperclip + comment count (when collapsed) */}
      {!showExpanded && (hasTags || hasAttachments || commentCount > 0) && (
        <div className="flex flex-wrap items-center gap-1 mt-1.5">
          {(node.tags ?? []).slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="text-[9px] font-mono px-1 py-0 rounded bg-void-700/40 text-slate-600"
            >
              {tag}
            </span>
          ))}
          {(node.tags ?? []).length > 2 && (
            <span className="text-[9px] text-slate-600 font-mono">+{(node.tags ?? []).length - 2}</span>
          )}
        </div>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        style={{ left: 0, bottom: 0, width: '100%', height: '20px', transform: 'translateY(50%)', borderRadius: '0 0 8px 8px', border: 'none' }}
        className="!bg-void-600/10 hover:!bg-void-600/40 transition-colors cursor-crosshair"
      />

      {/* Long-press context menu — inside card DOM so it scales with canvas zoom */}
      {menuOpen && (
        <div
          className="nodrag absolute inset-0 z-50 flex items-center justify-center rounded-lg"
          style={{ backgroundColor: 'rgba(10,10,20,0.85)', backdropFilter: 'blur(4px)' }}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          {!branchPickerOpen ? (
            <div className="flex flex-col items-center gap-1.5 px-3 py-2 w-full">
              <button
                className="nodrag w-full flex items-center gap-2 px-3 py-1.5 rounded bg-void-700/80 border border-void-600/60 text-[11px] font-mono text-slate-200 hover:bg-void-600 transition-colors"
                onClick={() => setBranchPickerOpen(true)}
              >
                <GitBranch size={11} className="text-cosmic-cyan" /> Branch
              </button>
              <button
                className="nodrag w-full flex items-center gap-2 px-3 py-1.5 rounded bg-void-700/80 border border-void-600/60 text-[11px] font-mono text-slate-200 hover:bg-void-600 transition-colors"
                onClick={() => { data.onOpenPanel?.(node.id, 'chat'); setMenuOpen(false); }}
              >
                <Navigation size={11} className="text-cosmic-cyan" /> Navigate
              </button>
              <button
                className="nodrag w-full flex items-center gap-2 px-3 py-1.5 rounded bg-void-700/80 border border-void-600/60 text-[11px] font-mono text-slate-200 hover:bg-void-600 transition-colors"
                onClick={() => { data.onOpenPanel?.(node.id, 'edit'); setMenuOpen(false); }}
              >
                <Pencil size={11} className="text-slate-400" /> Edit
              </button>
              <button
                className="nodrag w-full flex items-center gap-2 px-3 py-1.5 rounded bg-void-700/80 border border-cosmic-rose/30 text-[11px] font-mono text-cosmic-rose hover:bg-cosmic-rose/10 transition-colors"
                onClick={() => { deleteNode(node.id); setMenuOpen(false); }}
              >
                <X size={11} /> Delete
              </button>
              <button
                className="nodrag mt-1 text-[9px] font-mono text-slate-600 hover:text-slate-400 transition-colors"
                onClick={() => setMenuOpen(false)}
              >
                cancel
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1.5 px-3 py-2 w-full">
              <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest mb-1">Connect as</span>
              {EDGE_TYPES.map((et) => (
                <button
                  key={et}
                  className="nodrag w-full px-3 py-1.5 rounded-full text-[10px] font-mono font-semibold border transition-colors hover:opacity-90"
                  style={{ borderColor: EDGE_COLORS[et] + '60', color: EDGE_COLORS[et], backgroundColor: EDGE_COLORS[et] + '18' }}
                  onClick={() => handleBranch(et)}
                >
                  {et.replace('_', ' ')}
                </button>
              ))}
              <button
                className="nodrag mt-1 text-[9px] font-mono text-slate-600 hover:text-slate-400 transition-colors"
                onClick={() => setBranchPickerOpen(false)}
              >
                back
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
