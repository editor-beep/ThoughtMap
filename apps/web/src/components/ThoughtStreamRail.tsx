import React, { useState, useRef, useEffect } from 'react';
import { useThoughtStore } from '@core/store';
import { Send, ArrowUpRight, Sparkles, User as UserIcon } from 'lucide-react';
import { NodeType } from '@types';

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

export default function ThoughtStreamRail() {
  const { chatHistory, sendChatMessage, extractToMap, isStreaming } = useThoughtStore();
  const [input, setInput] = useState('');
  const [extractTargetId, setExtractTargetId] = useState<string | null>(null);
  const [nodeTitle, setNodeTitle] = useState('');
  const [nodeType, setNodeType] = useState<NodeType>('thought');

  const containerRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [chatHistory]);

  useEffect(() => {
    if (extractTargetId) titleInputRef.current?.focus();
  }, [extractTargetId]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;
    const msg = input;
    setInput('');
    await sendChatMessage(msg);
  };

  const openExtract = (messageId: string) => {
    setExtractTargetId(messageId);
    setNodeTitle('');
    setNodeType('thought');
  };

  const commitExtract = () => {
    if (!nodeTitle.trim() || !extractTargetId) return;
    extractToMap(extractTargetId, nodeType, nodeTitle);
    setExtractTargetId(null);
    setNodeTitle('');
    setNodeType('thought');
  };

  const cancelExtract = () => {
    setExtractTargetId(null);
    setNodeTitle('');
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') commitExtract();
    if (e.key === 'Escape') cancelExtract();
  };

  const lastMsgId = chatHistory[chatHistory.length - 1]?.id;

  return (
    <aside className="w-96 h-full bg-void-900/95 flex flex-col border-l border-void-800/40 relative overflow-hidden">
      <div className="px-4 py-3.5 border-b border-void-800/60 bg-void-900/60 backdrop-blur-sm flex-shrink-0 flex items-center gap-2.5">
        <div className="w-1.5 h-1.5 rounded-full bg-cosmic-cyan animate-pulse" />
        <h3 className="font-mono text-xs tracking-wider uppercase text-slate-400">Thought Stream</h3>
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
              className={`px-3.5 py-2.5 rounded-xl text-sm leading-relaxed max-w-[85%] border ${
                message.role === 'user'
                  ? 'bg-void-700/80 text-slate-200 border-void-600/50 rounded-tr-sm'
                  : 'bg-void-900/60 text-slate-300 border-void-800/60 rounded-tl-sm'
              }`}
              style={
                message.role === 'assistant'
                  ? { borderLeftColor: 'rgba(6,182,212,0.45)', borderLeftWidth: '2px' }
                  : undefined
              }
            >
              {message.content}
              {message.role === 'assistant' && isStreaming && message.id === lastMsgId && (
                <span className="inline-block w-[2px] h-[14px] bg-cosmic-cyan/80 ml-0.5 animate-pulse align-middle" />
              )}
            </div>

            {message.role === 'assistant' && !message.extractedNodeId && message.content && !message.content.startsWith('⚠') && (
              <button
                onClick={() => openExtract(message.id)}
                className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-cosmic-cyan transition-colors"
              >
                <ArrowUpRight size={10} />
                <span>Crystallize to canvas</span>
              </button>
            )}

            {message.extractedNodeId && (
              <span className="text-[9px] font-mono text-slate-600 italic">✦ Anchored on canvas</span>
            )}
          </div>
        ))}
      </div>

      {extractTargetId && (
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
        <div className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isStreaming ? 'Navigating…' : 'Introduce a concept…'}
            disabled={isStreaming}
            className="w-full bg-void-800/60 text-sm border border-void-700/80 rounded-xl pl-4 pr-11 py-3 text-slate-200 focus:outline-none focus:border-cosmic-cyan/60 placeholder:text-slate-600 disabled:opacity-50 transition-colors"
          />
          <button
            type="submit"
            disabled={isStreaming || !input.trim()}
            className="absolute right-2.5 p-1.5 rounded-lg text-slate-600 hover:text-cosmic-cyan transition-colors disabled:opacity-30"
          >
            <Send size={15} />
          </button>
        </div>
      </form>
    </aside>
  );
}
