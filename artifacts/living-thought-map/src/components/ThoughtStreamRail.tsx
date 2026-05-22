import React, { useState, useRef, useEffect } from 'react';
import { useThoughtStore } from '../store';
import { Send, Compass, Sparkles, User as UserIcon, X } from 'lucide-react';
import CartographerSuggestionPanel from './CartographerSuggestionPanel';
import { NodeType } from '../types';

function getDisplayContent(content: string): string {
  const mapExtractIdx = content.search(/\*\*MAP EXTRACT\*\*|```json/);
  if (mapExtractIdx === -1) return content;
  return content.slice(0, mapExtractIdx).replace(/^1\.\s+\*\*REFLECTION & INSIGHTS\*\*\s*/i, '').trim();
}

function renderInline(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    return part;
  });
}

function MarkdownText({ text }: { text: string }) {
  const paragraphs = text.split(/\n{2,}/);
  return (
    <div className="space-y-2">
      {paragraphs.map((para, pi) => {
        const lines = para.split('\n');
        return (
          <p key={pi} className="leading-relaxed">
            {lines.map((line, li) => {
              const listMatch = line.match(/^(\d+)\.\s+(.*)/);
              if (listMatch) {
                return (
                  <span key={li} className="block pl-2">
                    <strong className="text-cosmic-cyan/70">{listMatch[1]}.</strong>{' '}
                    {renderInline(listMatch[2])}
                    {li < lines.length - 1 && <br />}
                  </span>
                );
              }
              return (
                <span key={li}>
                  {renderInline(line)}
                  {li < lines.length - 1 && <br />}
                </span>
              );
            })}
          </p>
        );
      })}
    </div>
  );
}

const NODE_TYPE_OPTIONS: { value: NodeType; label: string }[] = [
  { value: 'thought',       label: 'Thought' },
  { value: 'joke',          label: 'Joke' },
  { value: 'character',     label: 'Character' },
  { value: 'myth',          label: 'Myth' },
  { value: 'research',      label: 'Research' },
  { value: 'canon',         label: 'Canon' },
  { value: 'contradiction', label: 'Contradiction' },
  { value: 'artifact',      label: 'Artifact' },
  { value: 'fragment',      label: 'Fragment' }
];

export default function ThoughtStreamRail({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const {
    chatHistory,
    sendChatMessage,
    extractToMap,
    isStreaming,
    realms,
    addRealm,
    requestCartographerExtraction,
    cartographerExtractingMessageId,
    cartographerLoading,
    cartographerSuggestions,
    dismissCartographerSuggestions,
  } = useThoughtStore();
  const [input, setInput] = useState('');
  const [extractTargetId, setExtractTargetId] = useState<string | null>(null);
  const [nodeTitle, setNodeTitle] = useState('');
  const [nodeType, setNodeType] = useState<NodeType>('thought');
  const [nodeRealm, setNodeRealm] = useState<string>('');
  const [showNewRealm, setShowNewRealm] = useState(false);
  const [newRealmInput, setNewRealmInput] = useState('');
  const [useManualMode, setUseManualMode] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [chatHistory]);

  useEffect(() => {
    if (extractTargetId && useManualMode) titleInputRef.current?.focus();
  }, [extractTargetId, useManualMode]);

  useEffect(() => {
    if (!cartographerExtractingMessageId && !cartographerSuggestions) {
      setUseManualMode(false);
    }
  }, [cartographerExtractingMessageId, cartographerSuggestions]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;
    const msg = input;
    setInput('');
    await sendChatMessage(msg);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e as unknown as React.FormEvent);
    }
  };

  const openExtract = (messageId: string) => {
    setExtractTargetId(messageId);
    setUseManualMode(false);
    requestCartographerExtraction(messageId);
  };

  const switchToManualMode = () => {
    setUseManualMode(true);
    setNodeTitle('');
    setNodeType('thought');
    setNodeRealm('');
    setShowNewRealm(false);
    setNewRealmInput('');
    dismissCartographerSuggestions();
  };

  const commitExtract = () => {
    if (!nodeTitle.trim() || !extractTargetId) return;
    extractToMap(extractTargetId, nodeType, nodeTitle, nodeRealm || undefined);
    setExtractTargetId(null);
    setNodeTitle('');
    setNodeType('thought');
    setNodeRealm('');
    setShowNewRealm(false);
    setNewRealmInput('');
    setUseManualMode(false);
  };

  const cancelExtract = () => {
    setExtractTargetId(null);
    setNodeTitle('');
    setNodeRealm('');
    setShowNewRealm(false);
    setNewRealmInput('');
    setUseManualMode(false);
    dismissCartographerSuggestions();
  };

  const handleCreateRealm = () => {
    const trimmed = newRealmInput.trim();
    if (!trimmed) return;
    const newId = addRealm(trimmed);
    setNodeRealm(newId);
    setNewRealmInput('');
    setShowNewRealm(false);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') commitExtract();
    if (e.key === 'Escape') cancelExtract();
  };

  const lastMsgId = chatHistory[chatHistory.length - 1]?.id;
  const showCartographerPanel = cartographerExtractingMessageId && !useManualMode;
  const showManualPanel = extractTargetId && useManualMode;

  return (
    <aside className={`fixed md:relative inset-0 md:inset-auto w-full md:w-96 h-full bg-void-900/95 flex flex-col border-l border-void-800/40 relative overflow-hidden z-50 md:z-auto transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}`}>
      <div className="px-4 py-3.5 border-b border-void-800/60 bg-void-900/60 backdrop-blur-sm flex-shrink-0 flex items-center gap-2.5">
        <div className="w-2 h-2 rounded-full bg-cosmic-cyan animate-pulse" style={{ boxShadow: '0 0 8px rgba(6,182,212,0.7)' }} />
        <h3 className="font-mono text-xs tracking-wider uppercase text-slate-300 flex-1">Thought Stream</h3>
        <button onClick={onClose} className="md:hidden text-slate-600 hover:text-slate-300 transition-colors p-1">
          <X size={16} />
        </button>
      </div>

      <div ref={containerRef} className="flex-1 overflow-y-auto p-4 space-y-5 min-h-0">
        {chatHistory.map((message) => (
          <div key={message.id} className={`flex flex-col gap-1.5 ${message.role === 'user' ? 'items-end' : 'items-start'}`}>

            {message.role === 'user' ? (
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-slate-500">You</span>
                <div className="w-4 h-4 rounded-full bg-void-700 border border-void-600 flex items-center justify-center">
                  <UserIcon size={8} className="text-slate-400" />
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded-full bg-cosmic-cyan/10 border border-cosmic-cyan/25 flex items-center justify-center">
                  <Sparkles size={8} className="text-cosmic-cyan" />
                </div>
                <span className="text-[10px] text-cosmic-cyan/60">Navigator</span>
              </div>
            )}

            <div
              className={`px-3.5 py-2.5 rounded-xl text-sm max-w-[85%] border ${
                message.role === 'user'
                  ? 'bg-void-700/80 text-slate-200 border-void-600/50 rounded-tr-sm leading-relaxed'
                  : 'bg-void-900/60 text-slate-300 border-void-800/60 rounded-tl-sm'
              }`}
              style={
                message.role === 'assistant'
                  ? { borderLeftColor: 'rgba(6,182,212,0.65)', borderLeftWidth: '3px' }
                  : undefined
              }
            >
              {message.role === 'assistant' ? (
                <>
                  <MarkdownText text={getDisplayContent(message.content)} />
                  {isStreaming && message.id === lastMsgId && (
                    <span className="inline-block w-[2px] h-[14px] bg-cosmic-cyan/80 ml-0.5 animate-pulse align-middle" />
                  )}
                </>
              ) : (
                <>
                  {message.content}
                  {isStreaming && message.id === lastMsgId && (
                    <span className="inline-block w-[2px] h-[14px] bg-cosmic-cyan/80 ml-0.5 animate-pulse align-middle" />
                  )}
                </>
              )}
            </div>

            {message.role === 'assistant' && !message.extractedNodeId && message.content && !message.content.startsWith('⚠') && (
              <button
                onClick={() => openExtract(message.id)}
                disabled={cartographerLoading}
                className="flex items-center gap-1.5 text-xs text-cosmic-cyan/50 hover:text-cosmic-cyan transition-colors disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                <Compass size={11} className={`${cartographerExtractingMessageId === message.id && cartographerLoading ? 'animate-spin' : 'group-hover:rotate-45 transition-transform'}`} />
                <span>Crystallize to canvas</span>
              </button>
            )}

            {message.extractedNodeId && (
              <span className="text-[9px] font-mono text-slate-600 italic">✦ Anchored on canvas</span>
            )}
          </div>
        ))}
      </div>

      {/* Cartographer Suggestion Panel */}
      {showCartographerPanel && <CartographerSuggestionPanel onSwitchToManual={switchToManualMode} />}

      {/* Manual extraction panel */}
      {showManualPanel && (
        <div className="flex-shrink-0 p-4 bg-void-800/95 border-t border-void-700/60 space-y-3 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-widest text-cosmic-cyan/70">Crystallize to Canvas</span>
            <button onClick={cancelExtract} className="text-slate-600 hover:text-slate-300 transition-colors text-sm">✕</button>
          </div>
          <input
            ref={titleInputRef}
            type="text"
            placeholder="Node title..."
            value={nodeTitle}
            onChange={(e) => setNodeTitle(e.target.value)}
            onKeyDown={handleTitleKeyDown}
            className="w-full bg-void-900 border border-void-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cosmic-cyan text-slate-200 placeholder:text-slate-600 transition-colors"
          />
          <select
            value={nodeType}
            onChange={(e) => setNodeType(e.target.value as NodeType)}
            className="w-full bg-void-900 border border-void-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cosmic-cyan text-slate-400 transition-colors"
          >
            {NODE_TYPE_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setNodeRealm('')}
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono border transition-colors ${
                nodeRealm === ''
                  ? 'border-cosmic-cyan/60 text-cosmic-cyan bg-cosmic-cyan/10'
                  : 'border-void-600 text-slate-500 hover:border-slate-500'
              }`}
            >
              No realm
            </button>
            {realms.map((r) => (
              <button
                key={r.id}
                onClick={() => setNodeRealm(r.id)}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono border transition-colors ${
                  nodeRealm === r.id
                    ? 'border-current text-current'
                    : 'border-void-600 text-slate-500 hover:border-slate-500'
                }`}
                style={nodeRealm === r.id ? { color: r.color, borderColor: r.color, backgroundColor: r.color + '18' } : {}}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: r.color }}
                />
                {r.name}
              </button>
            ))}
            {showNewRealm ? (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] border border-cosmic-cyan/50 bg-cosmic-cyan/5">
                <input
                  autoFocus
                  value={newRealmInput}
                  onChange={(e) => setNewRealmInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateRealm();
                    if (e.key === 'Escape') { setShowNewRealm(false); setNewRealmInput(''); }
                  }}
                  placeholder="Name…"
                  className="bg-transparent text-slate-200 placeholder:text-slate-600 outline-none w-20 font-mono text-[10px]"
                />
                <button onClick={handleCreateRealm} className="text-cosmic-cyan hover:text-white transition-colors">✓</button>
                <button onClick={() => { setShowNewRealm(false); setNewRealmInput(''); }} className="text-slate-600 hover:text-slate-300 transition-colors">✕</button>
              </span>
            ) : (
              <button
                onClick={() => setShowNewRealm(true)}
                className="px-2 py-0.5 rounded-full text-[10px] font-mono border border-dashed border-void-600 text-slate-600 hover:border-slate-500 hover:text-slate-400 transition-colors"
              >
                + New
              </button>
            )}
          </div>
          <div className="flex gap-2 justify-end">
            <button
              onClick={cancelExtract}
              className="px-3 py-1.5 rounded-lg text-sm text-slate-500 hover:text-slate-300 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={commitExtract}
              disabled={!nodeTitle.trim()}
              className="px-4 py-1.5 rounded-lg text-sm bg-cosmic-cyan text-void-900 font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
            >
              Materialize
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSend} className="p-4 border-t border-void-800/60 bg-void-900/60 flex-shrink-0">
        <div className="relative flex items-end">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder={isStreaming ? 'Navigating…' : 'Introduce a concept…'}
            disabled={isStreaming}
            rows={1}
            className="w-full bg-void-800/80 text-sm border border-void-700/80 rounded-2xl pl-4 pr-11 py-3 text-slate-200 focus:outline-none focus:border-cosmic-cyan/60 placeholder:text-slate-600 disabled:opacity-50 transition-colors resize-none overflow-hidden leading-relaxed"
            style={{ maxHeight: '120px', overflowY: input.split('\n').length > 4 ? 'auto' : 'hidden' }}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = 'auto';
              el.style.height = Math.min(el.scrollHeight, 120) + 'px';
            }}
          />
          <button
            type="submit"
            disabled={isStreaming || !input.trim()}
            className="absolute right-2.5 bottom-2.5 p-1.5 rounded-lg text-slate-600 hover:text-cosmic-cyan transition-colors disabled:opacity-30"
          >
            <Send size={15} />
          </button>
        </div>
        <p className="text-[10px] text-slate-600 mt-1.5 text-center">Enter to send · Shift+Enter for new line</p>
      </form>
    </aside>
  );
}
