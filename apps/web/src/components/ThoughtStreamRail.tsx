import React, { useState, useRef, useEffect } from 'react';
import { useThoughtStore } from '@core/store';
import { Send, ArrowUpRight, Compass } from 'lucide-react';
import { NodeType } from '@types';
import CartographerSuggestionPanel from './CartographerSuggestionPanel';

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
  const {
    chatHistory,
    sendChatMessage,
    extractToMap,
    isStreaming,
    requestCartographerExtraction,
    cartographerExtractingMessageId,
    cartographerLoading,
    cartographerSuggestions,
    dismissCartographerSuggestions
  } = useThoughtStore();
  
  const [input, setInput] = useState('');
  const [extractTargetId, setExtractTargetId] = useState<string | null>(null);
  const [nodeTitle, setNodeTitle] = useState('');
  const [nodeType, setNodeType] = useState<NodeType>('thought');
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

  // Reset manual mode when Cartographer suggestions are dismissed
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

  const openExtract = (messageId: string) => {
    // First, try the Cartographer
    setExtractTargetId(messageId);
    setUseManualMode(false);
    requestCartographerExtraction(messageId);
  };

  const switchToManualMode = () => {
    setUseManualMode(true);
    setNodeTitle('');
    setNodeType('thought');
    dismissCartographerSuggestions();
  };

  const commitExtract = () => {
    if (!nodeTitle.trim() || !extractTargetId) return;
    extractToMap(extractTargetId, nodeType, nodeTitle);
    setExtractTargetId(null);
    setNodeTitle('');
    setNodeType('thought');
    setUseManualMode(false);
  };

  const cancelExtract = () => {
    setExtractTargetId(null);
    setNodeTitle('');
    setUseManualMode(false);
    dismissCartographerSuggestions();
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') commitExtract();
    if (e.key === 'Escape') cancelExtract();
  };

  const lastMsgId = chatHistory[chatHistory.length - 1]?.id;

  // Determine what panel to show
  const showCartographerPanel = cartographerExtractingMessageId && !useManualMode;
  const showManualPanel = extractTargetId && useManualMode;

  return (
    <aside className="w-96 h-full bg-void-900/95 flex flex-col border-l border-void-800/40 relative overflow-hidden">
      <div className="p-4 border-b border-void-800/60 bg-void-900/40 backdrop-blur-sm flex-shrink-0">
        <h3 className="font-mono text-xs tracking-wider uppercase text-slate-400">Thought Stream</h3>
      </div>

      <div ref={containerRef} className="flex-1 overflow-y-auto p-4 space-y-6 min-h-0">
        {chatHistory.map((message) => (
          <div key={message.id} className={`flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
            <span className="text-[9px] font-mono text-slate-600 mb-1">
              {message.role === 'user' ? '// TRANSMISSION' : '// COGNITION'}
            </span>

            <div
              className={`p-3 rounded-lg text-xs leading-relaxed max-w-[85%] font-sans ${
                message.role === 'user'
                  ? 'bg-void-800 text-slate-200 border border-void-700/50'
                  : 'bg-void-900/60 text-slate-300 border border-void-800/30'
              }`}
            >
              {message.content}
              {message.role === 'assistant' && isStreaming && message.id === lastMsgId && (
                <span className="inline-block w-[2px] h-3 bg-cosmic-cyan/80 ml-0.5 animate-pulse align-middle" />
              )}
            </div>

            {message.role === 'assistant' && !message.extractedNodeId && (
              <button
                onClick={() => openExtract(message.id)}
                disabled={cartographerLoading}
                className="mt-1.5 flex items-center gap-1 font-mono text-[10px] text-cosmic-cyan hover:text-cyan-400 transition-colors bg-void-800/30 px-2 py-0.5 rounded border border-void-800 disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                <Compass size={10} className={`${cartographerExtractingMessageId === message.id && cartographerLoading ? 'animate-spin' : 'group-hover:rotate-45 transition-transform'}`} />
                <span>Extract to map</span>
              </button>
            )}

            {message.extractedNodeId && (
              <span className="mt-1 text-[9px] font-mono text-slate-600 italic">Crystallized onto canvas</span>
            )}
          </div>
        ))}
      </div>

      {/* Cartographer Suggestion Panel */}
      {showCartographerPanel && (
        <CartographerSuggestionPanel />
      )}

      {/* Manual extraction panel - shown when user chooses "I'll place it myself" */}
      {showManualPanel && (
        <div className="flex-shrink-0 p-4 bg-void-800/95 border-t border-void-700/60 space-y-3 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">Manual Extraction</span>
            <button onClick={cancelExtract} className="text-slate-600 hover:text-slate-300 transition-colors font-mono text-xs">X</button>
          </div>
          <input
            ref={titleInputRef}
            type="text"
            placeholder="Node title..."
            value={nodeTitle}
            onChange={(e) => setNodeTitle(e.target.value)}
            onKeyDown={handleTitleKeyDown}
            className="w-full bg-void-900 border border-void-700 rounded px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:border-cosmic-cyan text-slate-200 placeholder:text-slate-600"
          />
          <select
            value={nodeType}
            onChange={(e) => setNodeType(e.target.value as NodeType)}
            className="w-full bg-void-900 border border-void-700 rounded px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:border-cosmic-cyan text-slate-400"
          >
            {NODE_TYPE_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <div className="flex gap-2 justify-end">
            <button
              onClick={cancelExtract}
              className="px-2.5 py-1 rounded font-mono text-[10px] text-slate-500 hover:text-slate-300 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={commitExtract}
              disabled={!nodeTitle.trim()}
              className="px-3 py-1 rounded font-mono text-[10px] bg-cosmic-cyan text-void-900 font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
            >
              Materialize Node
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSend} className="p-4 border-t border-void-800/60 bg-void-900/50 flex-shrink-0">
        <div className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isStreaming ? 'Processing...' : 'Introduce a concept...'}
            disabled={isStreaming}
            className="w-full bg-void-900 text-xs font-mono border border-void-800/80 rounded-lg pl-3 pr-10 py-3 text-slate-200 focus:outline-none focus:border-cosmic-cyan/50 placeholder:text-slate-600 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isStreaming || !input.trim()}
            className="absolute right-2 p-1.5 rounded-md text-slate-600 hover:text-cosmic-cyan transition-colors disabled:opacity-30"
          >
            <Send size={14} />
          </button>
        </div>
      </form>
    </aside>
  );
}
