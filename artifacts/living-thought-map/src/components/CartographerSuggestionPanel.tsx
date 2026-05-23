import React, { useState } from 'react';
import { useThoughtStore } from '../store';
import { Compass, Sparkles, MapPin, X, ChevronRight, Check } from 'lucide-react';
import type { CartographerVariation, NodeType } from '../types';

const NODE_TYPE_COLORS: Record<NodeType, string> = {
  thought: '#06b6d4',
  joke: '#f59e0b',
  character: '#a855f7',
  myth: '#a855f7',
  research: '#3b82f6',
  canon: '#10b981',
  contradiction: '#f43f5e',
  artifact: '#64748b',
  fragment: '#475569',
};

const NODE_TYPE_LABELS: Record<NodeType, string> = {
  thought: 'Thought',
  joke: 'Joke',
  character: 'Character',
  myth: 'Myth',
  research: 'Research',
  canon: 'Canon',
  contradiction: 'Contradiction',
  artifact: 'Artifact',
  fragment: 'Fragment',
};

interface VariationCardProps {
  variation: CartographerVariation;
  index: number;
  onSelect: (index: number, customTitle?: string) => void;
  isApplied: boolean;
}

function VariationCard({ variation, index, onSelect, isApplied }: VariationCardProps) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [customTitle, setCustomTitle] = useState(variation.title);

  const handleMaterialize = () => {
    if (isApplied) return;
    onSelect(index, customTitle !== variation.title ? customTitle : undefined);
  };

  const formatZone = (zone: string) => {
    if (zone.startsWith('near:')) return 'Near existing node';
    return zone.charAt(0).toUpperCase() + zone.slice(1) + ' region';
  };

  return (
    <div className={`bg-void-900/80 border rounded-lg p-3 space-y-3 transition-colors ${isApplied ? 'border-green-800/40 opacity-70' : 'border-void-700/50 hover:border-void-600/60'}`}>
      <div className="flex items-start justify-between gap-2">
        {editingTitle && !isApplied ? (
          <input
            type="text"
            value={customTitle}
            onChange={(e) => setCustomTitle(e.target.value)}
            onBlur={() => setEditingTitle(false)}
            onKeyDown={(e) => e.key === 'Enter' && setEditingTitle(false)}
            autoFocus
            className="flex-1 bg-void-800 border border-void-600 rounded px-2 py-1 text-xs font-mono text-slate-200 focus:outline-none focus:border-cosmic-cyan"
          />
        ) : (
          <h4
            onClick={() => !isApplied && setEditingTitle(true)}
            className={`flex-1 font-mono text-sm text-slate-200 transition-colors ${isApplied ? 'cursor-default' : 'cursor-text hover:text-cosmic-cyan'}`}
            title={isApplied ? undefined : 'Click to edit title'}
          >
            {customTitle}
          </h4>
        )}
        <span
          className="px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider"
          style={{
            backgroundColor: `${NODE_TYPE_COLORS[variation.type]}20`,
            color: NODE_TYPE_COLORS[variation.type],
          }}
        >
          {NODE_TYPE_LABELS[variation.type]}
        </span>
      </div>

      {variation.realms.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {variation.realms.map((realm) => (
            <span
              key={realm}
              className="px-1.5 py-0.5 rounded bg-void-800 text-[9px] font-mono text-slate-500 border border-void-700/50"
            >
              {realm}
            </span>
          ))}
        </div>
      )}

      <p className="text-[11px] text-slate-500 italic leading-relaxed border-l-2 border-void-700 pl-2">
        {variation.reasoning}
      </p>

      <div className="flex items-center gap-1.5 text-[10px] text-slate-600">
        <MapPin size={10} />
        <span>{formatZone(variation.suggestedZone)}</span>
      </div>

      <button
        onClick={handleMaterialize}
        disabled={isApplied}
        className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded border text-[11px] font-mono transition-all group ${
          isApplied
            ? 'bg-green-900/20 border-green-800/40 text-green-400 cursor-default'
            : 'bg-cosmic-cyan/10 border-cosmic-cyan/30 text-cosmic-cyan hover:bg-cosmic-cyan/20 hover:border-cosmic-cyan/50'
        }`}
      >
        {isApplied ? (
          <>
            <Check size={12} />
            <span>Materialized</span>
          </>
        ) : (
          <>
            <Sparkles size={12} className="group-hover:animate-pulse" />
            <span>Materialize</span>
            <ChevronRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
          </>
        )}
      </button>
    </div>
  );
}

interface CartographerSuggestionPanelProps {
  onSwitchToManual?: () => void;
}

export default function CartographerSuggestionPanel({ onSwitchToManual }: CartographerSuggestionPanelProps) {
  const {
    cartographerLoading,
    cartographerSuggestions,
    cartographerInsight,
    cartographerExtractingMessageId,
    cartographerAppliedIndices,
    applyCartographerSuggestion,
    dismissCartographerSuggestions,
  } = useThoughtStore();

  if (!cartographerExtractingMessageId && !cartographerLoading && !cartographerSuggestions) {
    return null;
  }

  const handleManualExtract = () => {
    if (onSwitchToManual) {
      onSwitchToManual();
    } else {
      dismissCartographerSuggestions();
    }
  };

  const allApplied = cartographerSuggestions
    ? cartographerSuggestions.every((_, i) => cartographerAppliedIndices.includes(i))
    : false;

  return (
    <div className="flex-shrink-0 bg-void-800/95 border-t border-void-700/60 backdrop-blur-sm">
      <div className="flex items-center justify-between px-4 py-3 border-b border-void-700/40">
        <div className="flex items-center gap-2 min-w-0 overflow-hidden">
          <Compass size={14} className={`flex-shrink-0 text-cosmic-cyan ${cartographerLoading ? 'animate-spin' : ''}`} />
          <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 truncate">
            {cartographerLoading ? 'The Cartographer is studying...' : 'The Cartographer suggests'}
          </span>
        </div>
        <button
          onClick={dismissCartographerSuggestions}
          className="flex-shrink-0 text-slate-600 hover:text-slate-300 transition-colors p-1"
        >
          <X size={14} />
        </button>
      </div>

      <div className="p-4 max-h-80 overflow-y-auto space-y-4">
        {cartographerLoading && (
          <div className="flex flex-col items-center justify-center py-8 space-y-3">
            <div className="w-8 h-8 rounded-full border-2 border-cosmic-cyan/30 border-t-cosmic-cyan animate-spin" />
            <p className="text-[11px] font-mono text-slate-500 text-center">
              Analyzing the topology of this thought...
            </p>
          </div>
        )}

        {!cartographerLoading && cartographerSuggestions && cartographerSuggestions.length > 0 && (
          <>
            {cartographerInsight && (
              <div className="bg-void-900/60 border border-void-700/30 rounded-lg p-3 mb-4">
                <p className="text-[11px] text-slate-400 italic leading-relaxed">
                  {cartographerInsight}
                </p>
              </div>
            )}
            <div className="space-y-3">
              {cartographerSuggestions.map((variation, index) => (
                <VariationCard
                  key={index}
                  variation={variation}
                  index={index}
                  onSelect={applyCartographerSuggestion}
                  isApplied={cartographerAppliedIndices.includes(index)}
                />
              ))}
            </div>
            <div className="flex flex-col gap-1 pt-1">
              <button
                onClick={dismissCartographerSuggestions}
                className={`w-full text-center py-2 text-[10px] font-mono transition-colors ${
                  cartographerAppliedIndices.length > 0
                    ? 'text-cosmic-cyan/70 hover:text-cosmic-cyan'
                    : 'text-slate-600 hover:text-slate-400'
                }`}
              >
                {allApplied ? 'All materialized — Done' : cartographerAppliedIndices.length > 0 ? 'Done' : 'Dismiss'}
              </button>
              {cartographerExtractingMessageId && (
                <button
                  onClick={handleManualExtract}
                  className="w-full text-center py-1 text-[10px] font-mono text-slate-600 hover:text-slate-400 transition-colors"
                >
                  I&apos;ll place it myself
                </button>
              )}
            </div>
          </>
        )}

        {!cartographerLoading && cartographerSuggestions && cartographerSuggestions.length === 0 && (
          <div className="text-center py-6">
            <p className="text-[11px] font-mono text-slate-500">
              The Cartographer could not divine a clear path for this thought.
            </p>
            <button
              onClick={handleManualExtract}
              className="mt-3 px-3 py-1.5 rounded bg-void-700 text-[10px] font-mono text-slate-400 hover:text-slate-200 transition-colors"
            >
              Extract manually
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
