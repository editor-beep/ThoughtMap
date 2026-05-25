import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X, Send, Edit3, MessageSquare, Link2,
  Sparkles, Smile, User, BookOpen, Microscope,
  Archive, AlertTriangle, Package, Layers, Trash2, Compass,
  Bold, Italic, Heading1, Heading2, Heading3, List, ListOrdered,
  Paperclip, Image, Link, FileText, MessageCircle, Tag, Plus, Copy,
  GitBranchPlus,
  type LucideIcon
} from 'lucide-react';
import { useThoughtStore } from '../store';
import { NodeType, Attachment, NodeComment, CartographerStyle } from '../types';

function getDisplayContent(content: string): string {
  const mapExtractIdx = content.search(/\*\*MAP EXTRACT\*\*|```json/);
  if (mapExtractIdx === -1) return content;
  return content
    .slice(0, mapExtractIdx)
    .replace(/^(?:\d+\.\s+)?\*\*REFLECTION & INSIGHTS\*\*\s*/i, '')
    .replace(/\s*\d+\.\s*$/, '')
    .trim();
}

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



const CHAT_VOICE_OPTIONS: { value: CartographerStyle; label: string }[] = [
  { value: 'default', label: 'Default' },
  { value: 'academic', label: 'Academic' },
  { value: 'systems', label: 'Systems' },
  { value: 'mythic', label: 'Mythic' },
  { value: 'ritual', label: 'Ritual' },
  { value: 'void', label: 'Void' },
];

type Tab = 'chat' | 'edit' | 'links';

interface Props {
  nodeId: string | null;
  onClose: () => void;
}

// ─── Rich text toolbar ─────────────────────────────────────────────────────

interface ToolbarProps {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (v: string) => void;
  inlineOnly?: boolean;
  /** Position for floating toolbar: null means static */
  position?: { top: number; left: number } | null;
}

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

function prefixLine(
  textarea: HTMLTextAreaElement,
  value: string,
  prefix: string,
  onChange: (v: string) => void
) {
  const start = textarea.selectionStart;
  const lineStart = value.lastIndexOf('\n', start - 1) + 1;
  const lineEnd = value.indexOf('\n', start);
  const end = lineEnd === -1 ? value.length : lineEnd;
  const line = value.slice(lineStart, end);

  // Remove any existing heading prefix or list prefix
  const stripped = line.replace(/^#{1,3} /, '').replace(/^[-*] /, '').replace(/^\d+\. /, '');

  const newLine = line.startsWith(prefix) ? stripped : prefix + stripped;
  const newValue = value.slice(0, lineStart) + newLine + value.slice(end);
  onChange(newValue);
  requestAnimationFrame(() => {
    textarea.focus();
    const delta = newLine.length - line.length;
    textarea.setSelectionRange(start + delta, start + delta);
  });
}

function prefixListItem(
  textarea: HTMLTextAreaElement,
  value: string,
  listType: 'ul' | 'ol',
  onChange: (v: string) => void
) {
  const start = textarea.selectionStart;
  const lineStart = value.lastIndexOf('\n', start - 1) + 1;
  const lineEnd = value.indexOf('\n', start);
  const end = lineEnd === -1 ? value.length : lineEnd;
  const line = value.slice(lineStart, end);
  const stripped = line.replace(/^#{1,3} /, '').replace(/^[-*] /, '').replace(/^\d+\. /, '');
  const prefix = listType === 'ul' ? '- ' : '1. ';
  const alreadyUL = /^[-*] /.test(line);
  const alreadyOL = /^\d+\. /.test(line);
  const already = listType === 'ul' ? alreadyUL : alreadyOL;
  const newLine = already ? stripped : prefix + stripped;
  const newValue = value.slice(0, lineStart) + newLine + value.slice(end);
  onChange(newValue);
  requestAnimationFrame(() => {
    textarea.focus();
    const delta = newLine.length - line.length;
    textarea.setSelectionRange(start + delta, start + delta);
  });
}

function RichToolbar({ textareaRef, value, onChange, inlineOnly = false, position = null }: ToolbarProps) {
  const ta = textareaRef.current;

  const btn = (Icon: LucideIcon, label: string, action: () => void) => (
    <button
      key={label}
      type="button"
      title={label}
      onMouseDown={(e) => { e.preventDefault(); action(); }}
      className="p-1 rounded text-slate-500 hover:text-slate-200 hover:bg-void-700 transition-colors"
    >
      <Icon size={11} />
    </button>
  );

  const buttons: React.ReactNode[] = [
    btn(Bold, 'Bold', () => ta && wrapSelection(ta, value, '**', '**', onChange)),
    btn(Italic, 'Italic', () => ta && wrapSelection(ta, value, '*', '*', onChange)),
  ];

  if (!inlineOnly) {
    buttons.push(
      <div key="sep1" className="w-px h-3 bg-void-600 mx-0.5" />,
      btn(Heading1, 'Heading 1', () => ta && prefixLine(ta, value, '# ', onChange)),
      btn(Heading2, 'Heading 2', () => ta && prefixLine(ta, value, '## ', onChange)),
      btn(Heading3, 'Heading 3', () => ta && prefixLine(ta, value, '### ', onChange)),
      <div key="sep2" className="w-px h-3 bg-void-600 mx-0.5" />,
      btn(List, 'Unordered list', () => ta && prefixListItem(ta, value, 'ul', onChange)),
      btn(ListOrdered, 'Ordered list', () => ta && prefixListItem(ta, value, 'ol', onChange)),
    );
  }

  const style: React.CSSProperties = position
    ? { position: 'fixed', top: position.top, left: position.left, zIndex: 100 }
    : {};

  return (
    <div
      className="flex items-center gap-0.5 px-1.5 py-1 rounded-md bg-void-800 border border-void-600/60 shadow-lg"
      style={style}
    >
      {buttons}
    </div>
  );
}

// ─── Tags input ────────────────────────────────────────────────────────────

interface TagsInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
}

function TagsInput({ tags, onChange }: TagsInputProps) {
  const [input, setInput] = useState('');

  const commit = () => {
    const trimmed = input.trim().replace(/,+$/, '');
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
    }
    setInput('');
  };

  return (
    <div>
      <label className="block text-[9px] font-mono uppercase tracking-widest text-slate-500 mb-1.5 flex items-center gap-1">
        <Tag size={9} /> Tags
      </label>
      <div className="flex flex-wrap gap-1 mb-2">
        {tags.map((tag) => (
          <span
            key={tag}
            className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-void-700/60 text-slate-400 border border-void-600/40"
          >
            {tag}
            <button
              type="button"
              onClick={() => onChange(tags.filter((t) => t !== tag))}
              className="text-slate-600 hover:text-cosmic-rose transition-colors"
            >
              <X size={9} />
            </button>
          </span>
        ))}
      </div>
      <input
        type="text"
        value={input}
        onChange={(e) => {
          const v = e.target.value;
          if (v.endsWith(',')) {
            const trimmed = v.slice(0, -1).trim();
            if (trimmed && !tags.includes(trimmed)) onChange([...tags, trimmed]);
            setInput('');
          } else {
            setInput(v);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); commit(); }
          if (e.key === 'Backspace' && input === '' && tags.length > 0) {
            onChange(tags.slice(0, -1));
          }
        }}
        onBlur={commit}
        placeholder="Add tag, press Enter or comma…"
        className="w-full bg-void-800/60 border border-void-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-cosmic-cyan transition-colors placeholder:text-slate-600"
      />
    </div>
  );
}

// ─── Attachments section ───────────────────────────────────────────────────

interface AttachmentsSectionProps {
  attachments: Attachment[];
  onChange: (attachments: Attachment[]) => void;
}

function AttachmentsSection({ attachments, onChange }: AttachmentsSectionProps) {
  const [urlInput, setUrlInput] = useState('');
  const [fetchingTitle, setFetchingTitle] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addUrl = async () => {
    const raw = urlInput.trim();
    if (!raw) return;
    setUrlInput('');
    setFetchingTitle(true);
    let name = raw;
    try {
      // Try to fetch an Open Graph / page title via a CORS proxy isn't available,
      // so we just use the URL as the name. Title fetching would require a server endpoint.
      const url = new URL(raw);
      name = url.hostname + (url.pathname !== '/' ? url.pathname : '');
    } catch { /* not a valid URL */ }
    setFetchingTitle(false);
    const att: Attachment = { id: crypto.randomUUID(), type: 'url', url: raw, name };
    onChange([...attachments, att]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const url = ev.target?.result as string;
        const type: Attachment['type'] = file.type.startsWith('image/') ? 'image' : 'file';
        const att: Attachment = {
          id: crypto.randomUUID(),
          type,
          url,
          name: file.name,
          mimeType: file.type,
        };
        onChange([...attachments, att]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const remove = (id: string) => onChange(attachments.filter((a) => a.id !== id));

  return (
    <div>
      <label className="block text-[9px] font-mono uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-1">
        <Paperclip size={9} /> Attachments
      </label>

      {/* Existing attachments */}
      {attachments.length > 0 && (
        <div className="space-y-1.5 mb-3">
          {attachments.map((att) => (
            <div
              key={att.id}
              className="flex items-center gap-2 p-2 rounded-lg bg-void-700/40 border border-void-600/30 group"
            >
              {att.type === 'image' ? (
                <>
                  <img src={att.url} alt={att.name} className="w-10 h-10 rounded object-cover flex-shrink-0" />
                  <span className="text-xs text-slate-400 truncate flex-1">{att.name}</span>
                </>
              ) : att.type === 'url' ? (
                <>
                  <Link size={14} className="text-cosmic-cyan flex-shrink-0" />
                  <a
                    href={att.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-cosmic-cyan hover:text-cyan-300 truncate flex-1 transition-colors"
                  >
                    {att.name}
                  </a>
                </>
              ) : (
                <>
                  <FileText size={14} className="text-slate-400 flex-shrink-0" />
                  <span className="text-xs text-slate-400 truncate flex-1">{att.name}</span>
                  <a
                    href={att.url}
                    download={att.name}
                    className="text-[10px] text-slate-600 hover:text-slate-300 transition-colors"
                  >
                    ↓
                  </a>
                </>
              )}
              <button
                type="button"
                onClick={() => remove(att.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-600 hover:text-cosmic-rose"
              >
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add URL */}
      <div className="flex gap-1.5 mb-1.5">
        <input
          type="text"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addUrl(); } }}
          placeholder="Paste a URL…"
          className="flex-1 bg-void-800/60 border border-void-700/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-cosmic-cyan transition-colors placeholder:text-slate-600"
        />
        <button
          type="button"
          onClick={addUrl}
          disabled={!urlInput.trim() || fetchingTitle}
          className="px-2 py-1.5 rounded-lg bg-void-700/60 border border-void-600/40 text-xs text-slate-400 hover:text-slate-200 disabled:opacity-40 transition-colors"
        >
          <Plus size={11} />
        </button>
      </div>

      {/* Add image/file */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf,.txt"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="flex items-center gap-1.5 text-[10px] text-slate-600 hover:text-slate-400 transition-colors"
      >
        <Image size={10} />
        <span>Add image or file</span>
      </button>
    </div>
  );
}

// ─── Comments section ──────────────────────────────────────────────────────

interface CommentsSectionProps {
  content: string;
  comments: NodeComment[];
  onChange: (comments: NodeComment[]) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  pendingComment: { start: number; end: number } | null;
  onClearPending: () => void;
}

function CommentsSection({ content, comments, onChange, textareaRef, pendingComment, onClearPending }: CommentsSectionProps) {
  const [commentText, setCommentText] = useState('');

  const addComment = () => {
    if (!pendingComment || !commentText.trim()) return;
    const c: NodeComment = {
      id: crypto.randomUUID(),
      spanStart: pendingComment.start,
      spanEnd: pendingComment.end,
      text: commentText.trim(),
      createdAt: new Date().toISOString(),
    };
    onChange([...comments, c]);
    setCommentText('');
    onClearPending();
  };

  const remove = (id: string) => onChange(comments.filter((c) => c.id !== id));

  return (
    <div>
      <label className="block text-[9px] font-mono uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-1">
        <MessageCircle size={9} /> Comments {comments.length > 0 && <span className="text-slate-600">({comments.length})</span>}
      </label>

      {comments.length === 0 && !pendingComment && (
        <p className="text-[10px] text-slate-600 font-mono italic">
          Select text above then click "Add comment"
        </p>
      )}

      {/* Pending comment input */}
      {pendingComment && (
        <div className="mb-2 p-2 rounded-lg border border-cosmic-cyan/30 bg-cosmic-cyan/5">
          <p className="text-[9px] text-cosmic-cyan/70 font-mono mb-1.5">
            Commenting on: <em className="text-slate-300">"{content.slice(pendingComment.start, pendingComment.end).slice(0, 60)}"</em>
          </p>
          <textarea
            autoFocus
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addComment(); } if (e.key === 'Escape') { onClearPending(); setCommentText(''); } }}
            rows={2}
            placeholder="Add a comment…"
            className="w-full bg-void-800/60 border border-void-700/80 rounded-md px-2 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-cosmic-cyan transition-colors resize-none placeholder:text-slate-600"
          />
          <div className="flex gap-1.5 mt-1.5">
            <button
              type="button"
              onClick={addComment}
              disabled={!commentText.trim()}
              className="px-2 py-0.5 rounded bg-cosmic-cyan/20 text-[10px] text-cosmic-cyan hover:bg-cosmic-cyan/30 disabled:opacity-40 transition-colors"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => { onClearPending(); setCommentText(''); }}
              className="px-2 py-0.5 rounded bg-void-700/60 text-[10px] text-slate-500 hover:text-slate-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Existing comments */}
      {comments.length > 0 && (
        <div className="space-y-1.5">
          {comments.map((c) => (
            <div
              key={c.id}
              className="group flex gap-2 p-2 rounded-lg bg-void-700/30 border border-void-600/20"
            >
              <MessageCircle size={10} className="text-slate-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-[9px] text-slate-600 font-mono mb-0.5 truncate">
                  on: "<em>{content.slice(c.spanStart, c.spanEnd).slice(0, 40)}</em>"
                </p>
                <p className="text-[11px] text-slate-400 leading-relaxed">{c.text}</p>
              </div>
              <button
                type="button"
                onClick={() => remove(c.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-600 hover:text-cosmic-rose flex-shrink-0"
              >
                <X size={9} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main panel ────────────────────────────────────────────────────────────

export default function NodeDetailPanel({ nodeId, onClose }: Props) {
  const {
    nodes, realms, edges, updateNode, deleteNode, deleteEdge,
    nodeChats, nodeChatStreaming, sendNodeChatMessage,
    requestCartographerExtractionFromContent, cartographerLoading,
    splitNodeIntoNewMap, openSubMap,
  } = useThoughtStore();

  const node = nodes.find((n) => n.id === nodeId) ?? null;

  const [tab, setTab] = useState<Tab>('chat');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [nodeType, setNodeType] = useState<NodeType>('thought');
  const [tags, setTags] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [comments, setComments] = useState<NodeComment[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatVoice, setChatVoice] = useState<CartographerStyle>('default');
  const [pendingComment, setPendingComment] = useState<{ start: number; end: number } | null>(null);
  const [showAddComment, setShowAddComment] = useState(false);
  const [includeNeighborsOnSplit, setIncludeNeighborsOnSplit] = useState(false);

  // Floating toolbar state
  const [toolbarPos, setToolbarPos] = useState<{ top: number; left: number } | null>(null);
  const contentRef = useRef<HTMLTextAreaElement | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (node) {
      setTitle(node.title);
      setContent(node.content);
      setNodeType(node.type);
      setTags(node.tags ?? []);
      setAttachments(node.attachments ?? []);
      setComments(node.comments ?? []);
    }
    setTab('chat');
    setChatInput('');
    setPendingComment(null);
    setShowAddComment(false);
    setToolbarPos(null);
  }, [node?.id]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [nodeChats]);

  // Track text selection in the content textarea to show floating toolbar + comment affordance
  const handleContentSelect = useCallback(() => {
    const ta = contentRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    if (start === end) {
      setToolbarPos(null);
      setShowAddComment(false);
      return;
    }
    // Position toolbar above the textarea
    const rect = ta.getBoundingClientRect();
    setToolbarPos({ top: rect.top - 36, left: rect.left + 4 });
    setShowAddComment(true);
  }, []);

  const handleContentBlur = useCallback(() => {
    // Delay so toolbar button clicks are not cancelled
    setTimeout(() => setToolbarPos(null), 200);
  }, []);

  const handleSave = useCallback(() => {
    if (!node) return;
    updateNode(node.id, {
      title: title.trim() || node.title,
      content,
      type: nodeType,
      tags,
      attachments,
      comments,
    });
  }, [node, title, content, nodeType, tags, attachments, comments, updateNode]);

  const saveTagsNow = useCallback((next: string[]) => {
    if (!node) return;
    updateNode(node.id, { tags: next });
  }, [node, updateNode]);

  const saveAttachmentsNow = useCallback((next: Attachment[]) => {
    if (!node) return;
    updateNode(node.id, { attachments: next });
  }, [node, updateNode]);

  const saveCommentsNow = useCallback((next: NodeComment[]) => {
    if (!node) return;
    updateNode(node.id, { comments: next });
  }, [node, updateNode]);

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isStreaming) return;
    const msg = chatInput;
    setChatInput('');
    chatInputRef.current?.focus();
    await sendNodeChatMessage(node!.id, node!.title, node!.content, msg, chatVoice);
  };

  if (!node) return null;

  const Icon = TYPE_ICONS[node.type] ?? Sparkles;
  const typeColor = TYPE_COLORS[node.type] ?? '#06b6d4';
  const chat = nodeChats[node.id] ?? [];
  const isStreaming = nodeChatStreaming === node.id;
  const nodeEdges = edges.filter((e) => e.source === node.id || e.target === node.id);
  const realmMap = Object.fromEntries(realms.map((r) => [r.id, r]));

  const tabs: [Tab, string, LucideIcon][] = [
    ['chat', 'Chat', MessageSquare],
    ['edit', 'Edit', Edit3],
    ['links', `Links${nodeEdges.length ? ` (${nodeEdges.length})` : ''}`, Link2],
  ];

  return (
    <div className="absolute right-0 top-0 h-full w-[380px] bg-void-900/98 border-l border-void-700/60 flex flex-col z-30 backdrop-blur-md shadow-2xl">

      {/* Floating rich text toolbar (portal-style fixed positioning) */}
      {toolbarPos && (
        <RichToolbar
          textareaRef={contentRef}
          value={content}
          onChange={setContent}
          position={toolbarPos}
        />
      )}

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
        <button onClick={onClose} className="flex-shrink-0 text-slate-600 hover:text-slate-300 transition-colors p-1 rounded">
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
                  {msg.role === 'assistant' ? getDisplayContent(msg.content) : msg.content}
                  {isStreaming && msg.role === 'assistant' && msg === chat[chat.length - 1] && (
                    <span
                      className="inline-block w-[2px] h-[13px] ml-0.5 align-middle animate-pulse"
                      style={{ backgroundColor: typeColor }}
                    />
                  )}
                </div>
                {msg.content && !msg.content.startsWith('⚠') && !isStreaming && (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={async () => {
                        const text = msg.role === 'assistant' ? getDisplayContent(msg.content) : msg.content;
                        await navigator.clipboard.writeText(text);
                      }}
                      className="flex items-center gap-1 text-[10px] text-slate-600 hover:text-slate-300 transition-colors"
                    >
                      <Copy size={10} />
                      <span>Copy</span>
                    </button>
                    {msg.role === 'assistant' && (
                      <button
                        onClick={() => requestCartographerExtractionFromContent(getDisplayContent(msg.content))}
                        disabled={cartographerLoading}
                        className="flex items-center gap-1 text-[10px] text-slate-600 hover:text-cosmic-cyan transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Compass size={10} className={cartographerLoading ? 'animate-spin' : ''} />
                        <span>Crystallize to canvas</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
            <div ref={chatBottomRef} />
          </div>

          <form onSubmit={handleSendChat} className="p-3 border-t border-void-800/60 flex-shrink-0">
            <div className="mb-2">
              <label className="block text-[9px] font-mono uppercase tracking-widest text-slate-500 mb-1">Voice</label>
              <select
                value={chatVoice}
                onChange={(e) => setChatVoice(e.target.value as CartographerStyle)}
                disabled={isStreaming}
                className="w-full bg-void-800/60 border border-void-700/80 rounded-lg px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-cosmic-cyan/60 disabled:opacity-50"
              >
                {CHAT_VOICE_OPTIONS.map((voice) => (
                  <option key={voice.value} value={voice.value}>{voice.label}</option>
                ))}
              </select>
            </div>
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
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* Title — always editable */}
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

          {/* Content / Notes — body text editing for user-created nodes only */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[9px] font-mono uppercase tracking-widest text-slate-500">
                Content / Notes
              </label>
              <div className="flex-shrink-0">
                <RichToolbar
                  textareaRef={contentRef}
                  value={content}
                  onChange={setContent}
                />
              </div>
            </div>

            <textarea
              ref={contentRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onSelect={handleContentSelect}
              onKeyUp={handleContentSelect}
              onBlur={() => {
                handleContentBlur();
                handleSave();
              }}
              rows={8}
              className="w-full bg-void-800/60 border border-void-700/80 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-cosmic-cyan transition-colors resize-none leading-relaxed font-mono"
              placeholder="Add notes, context, or additional detail… (supports **bold**, *italic*, # headings, - lists)"
            />

            {/* Add comment affordance — only when text is selected */}
            {showAddComment && pendingComment === null && (
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  const ta = contentRef.current;
                  if (!ta) return;
                  const start = ta.selectionStart;
                  const end = ta.selectionEnd;
                  if (start !== end) {
                    setPendingComment({ start, end });
                    setShowAddComment(false);
                    setToolbarPos(null);
                  }
                }}
                className="mt-1.5 flex items-center gap-1 text-[10px] text-slate-600 hover:text-cosmic-cyan transition-colors"
              >
                <MessageCircle size={10} />
                <span>Add comment to selection</span>
              </button>
            )}
          </div>

          {/* Type — always editable */}
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

          {/* Anchor toggle */}
          <div>
            <label className="block text-[9px] font-mono uppercase tracking-widest text-slate-500 mb-1.5">Anchor</label>
            <button
              type="button"
              onClick={() => updateNode(node.id, { isAnchor: !(node.isAnchor ?? false) })}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-mono transition-colors border ${
                node.isAnchor
                  ? 'text-cosmic-cyan border-cosmic-cyan/40 bg-cosmic-cyan/10 hover:bg-cosmic-cyan/20'
                  : 'text-slate-500 border-void-700/80 bg-void-800/60 hover:text-slate-300 hover:border-void-600/80'
              }`}
            >
              {node.isAnchor ? '⚓ Anchored' : 'Set as Anchor'}
            </button>
          </div>

          {/* Realms — always display-only */}
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

          {/* Tags */}
          <TagsInput
            tags={tags}
            onChange={(t) => { setTags(t); saveTagsNow(t); }}
          />

          {/* Attachments — panel-only, no inline editing */}
          <div className="border-t border-void-800/60 pt-4">
            <AttachmentsSection
              attachments={attachments}
              onChange={(a) => { setAttachments(a); saveAttachmentsNow(a); }}
            />
          </div>

          {/* Comments */}
          <div className="border-t border-void-800/60 pt-4">
            <CommentsSection
              content={content}
              comments={comments}
              onChange={(c) => { setComments(c); saveCommentsNow(c); }}
              textareaRef={contentRef}
              pendingComment={pendingComment}
              onClearPending={() => setPendingComment(null)}
            />
          </div>

          {/* Delete */}
          <div className="pt-3 border-t border-void-800/60">
            <div className="mb-3">
              <button
                onClick={() => {
                  if (node.childMapId) {
                    openSubMap(node.id);
                    return;
                  }
                  const mapId = splitNodeIntoNewMap(node.id, includeNeighborsOnSplit);
                  if (mapId) openSubMap(node.id);
                }}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-cosmic-cyan transition-colors"
              >
                <GitBranchPlus size={11} />
                {node.childMapId ? 'Open Sub-Map' : 'Split Into New Map'}
              </button>
              {!node.childMapId && (
                <label className="mt-2 flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                  <input
                    type="checkbox"
                    checked={includeNeighborsOnSplit}
                    onChange={(e) => setIncludeNeighborsOnSplit(e.target.checked)}
                  />
                  Include directly connected nodes
                </label>
              )}
            </div>
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
