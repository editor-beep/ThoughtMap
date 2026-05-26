import React, { useState } from 'react';
import { useThoughtStore } from '../store';
import { Layers, Sparkles, Zap, Compass, ArrowRight, Check, ChevronDown, ChevronRight, X, MapPin } from 'lucide-react';
import type { CartographerVariation, Tension, EmergentTheme, NodeType } from '../types';

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

const INTENSITY_STYLES = {
  faint: 'text-slate-600',
  building: 'text-slate-400',
  strong: 'text-slate-200',
};

const INTENSITY_DOT = {
  faint: 'bg-amber-900/60',
  building: 'bg-amber-700/70',
  strong: 'bg-amber-500/80',
};

function CoreNodeCard({ variation, index, isApplied, onApply }: {
  variation: CartographerVariation;
  index: number;
  isApplied: boolean;
  onApply: (index: number, customTitle?: string) => void;
}) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [customTitle, setCustomTitle] = useState(variation.title);

  const formatZone = (zone: string) => {
    if (zone.startsWith('near:')) return 'Near existing node';
    return zone.charAt(0).toUpperCase() + zone.slice(1) + ' region';
  };

  return (
    <div className={`bg-void-900/80 border rounded-lg p-3 space-y-2.5 transition-colors ${isApplied ? 'border-green-800/40 opacity-70' : 'border-void-700/50 hover:border-cyan-900/60'}`}>
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
          className="px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider flex-shrink-0"
          style={{
            backgroundColor: `${NODE_TYPE_COLORS[variation.type]}20`,
            color: NODE_TYPE_COLORS[variation.type],
          }}
        >
          {NODE_TYPE_LABELS[variation.type]}
        </span>
      </div>

      <p className="text-[11px] text-slate-500 italic leading-relaxed border-l-2 border-void-700 pl-2">
        {variation.reasoning}
      </p>

      <div className="flex items-center gap-1.5 text-[10px] text-slate-600">
        <MapPin size={10} />
        <span>{formatZone(variation.suggestedZone)}</span>
      </div>

      <button
        onClick={() => !isApplied && onApply(index, customTitle !== variation.title ? customTitle : undefined)}
        disabled={isApplied}
        className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded border text-[11px] font-mono transition-all group ${
          isApplied
            ? 'bg-green-900/20 border-green-800/40 text-green-400 cursor-default'
            : 'bg-cosmic-cyan/10 border-cosmic-cyan/30 text-cosmic-cyan hover:bg-cosmic-cyan/20 hover:border-cosmic-cyan/50'
        }`}
      >
        {isApplied ? (
          <><Check size={12} /><span>Materialized</span></>
        ) : (
          <><Sparkles size={12} className="group-hover:animate-pulse" /><span>Materialize</span><ChevronRight size={12} className="group-hover:translate-x-0.5 transition-transform" /></>
        )}
      </button>
    </div>
  );
}

function TensionCard({ tension, index, isApplied, onApply }: {
  tension: Tension;
  index: number;
  isApplied: boolean;
  onApply: (index: number) => void;
}) {
  return (
    <div className={`bg-void-900/80 border rounded-lg p-3 space-y-2.5 transition-colors ${isApplied ? 'border-green-800/40 opacity-70' : 'border-rose-900/40 hover:border-rose-800/50'}`}>
      <h4 className="font-mono text-sm text-rose-300">{tension.title}</h4>

      <div className="flex items-center gap-2 text-[11px] font-mono">
        <span className="text-slate-400 truncate max-w-[35%]">{tension.conceptA}</span>
        <span className="text-rose-700 flex-shrink-0">⟷</span>
        <span className="text-slate-400 truncate max-w-[35%]">{tension.conceptB}</span>
      </div>

      <p className="text-[11px] text-slate-500 italic leading-relaxed border-l-2 border-rose-900/50 pl-2">
        {tension.description}
      </p>

      <p className="text-[10px] text-slate-600 italic">{tension.reasoning}</p>

      <button
        onClick={() => !isApplied && onApply(index)}
        disabled={isApplied}
        className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded border text-[11px] font-mono transition-all group ${
          isApplied
            ? 'bg-green-900/20 border-green-800/40 text-green-400 cursor-default'
            : 'bg-rose-950/30 border-rose-900/40 text-rose-400 hover:bg-rose-950/50 hover:border-rose-800/60'
        }`}
      >
        {isApplied ? (
          <><Check size={12} /><span>Crystallized</span></>
        ) : (
          <><Zap size={12} className="group-hover:animate-pulse" /><span>Crystallize Tension</span><ChevronRight size={12} className="group-hover:translate-x-0.5 transition-transform" /></>
        )}
      </button>
    </div>
  );
}

function ThemeCard({ theme, index, onNote }: {
  theme: EmergentTheme;
  index: number;
  onNote: (index: number) => void;
}) {
  return (
    <div className="bg-void-900/60 border border-amber-900/30 rounded-lg p-3 space-y-2 opacity-80 hover:opacity-100 transition-opacity">
      <div className="flex items-center gap-2">
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${INTENSITY_DOT[theme.intensity]}`} />
        <h4 className={`font-mono text-sm ${INTENSITY_STYLES[theme.intensity]}`}>{theme.label}</h4>
        <span className="ml-auto text-[9px] font-mono text-amber-800 uppercase tracking-wider">{theme.intensity}</span>
      </div>
      <p className="text-[11px] text-slate-600 italic leading-relaxed pl-3">
        {theme.description}
      </p>
      <button
        onClick={() => onNote(index)}
        className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded border border-amber-900/30 bg-amber-950/20 text-[11px] font-mono text-amber-700 hover:text-amber-500 hover:border-amber-800/40 transition-all group"
      >
        <span>Note as Fragment</span>
        <ChevronRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
      </button>
    </div>
  );
}

function Section({ title, icon, count, children, accent }: {
  title: string;
  icon: React.ReactNode;
  count: number;
  children: React.ReactNode;
  accent: string;
}) {
  const [open, setOpen] = useState(true);
  if (count === 0) return null;

  return (
    <div className="space-y-2">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 w-full text-left"
      >
        <span style={{ color: accent }}>{icon}</span>
        <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: accent }}>{title}</span>
        <span className="text-[9px] font-mono text-slate-600 ml-1">({count})</span>
        <span className="ml-auto text-slate-600">
          {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </span>
      </button>
      {open && <div className="space-y-2 pl-1">{children}</div>}
    </div>
  );
}

export default function CrystallizationResultPanel() {
  const {
    crystallizationResult,
    crystallizationLoading,
    crystallizationTurns,
    crystallizationAppliedNodes,
    crystallizationAppliedTensions,
    applyCrystallizationNode,
    applyCrystallizationTension,
    noteCrystallizationTheme,
    sendCrystallizationExpansion,
    dismissCrystallization,
  } = useThoughtStore();

  if (!crystallizationLoading && !crystallizationResult) return null;

  const result = crystallizationResult;
  const hasContent = result && (
    result.coreNodes.length > 0 ||
    result.tensions.length > 0 ||
    result.emergentThemes.length > 0 ||
    result.candidateExpansions.length > 0
  );

  return (
    <div className="flex-shrink-0 bg-void-800/95 border-t border-void-700/60 backdrop-blur-sm">
      <div className="flex items-center justify-between px-4 py-3 border-b border-void-700/40">
        <div className="flex items-center gap-2 min-w-0 overflow-hidden">
          <Layers size={14} className={`flex-shrink-0 text-cosmic-cyan ${crystallizationLoading ? 'animate-spin' : ''}`} />
          <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 truncate">
            {crystallizationLoading
              ? 'Reading the geological strata...'
              : `Crystallization — last ${crystallizationTurns} turn${crystallizationTurns !== 1 ? 's' : ''}`}
          </span>
        </div>
        <button
          onClick={dismissCrystallization}
          className="flex-shrink-0 text-slate-600 hover:text-slate-300 transition-colors p-1"
        >
          <X size={14} />
        </button>
      </div>

      <div className="p-4 max-h-96 overflow-y-auto space-y-5">
        {crystallizationLoading && (
          <div className="flex flex-col items-center justify-center py-8 space-y-3">
            <div className="w-8 h-8 rounded-full border-2 border-cosmic-cyan/30 border-t-cosmic-cyan animate-spin" />
            <p className="text-[11px] font-mono text-slate-500 text-center">
              Performing conceptual archaeology...
            </p>
          </div>
        )}

        {!crystallizationLoading && result && !hasContent && (
          <div className="text-center py-6">
            <p className="text-[11px] font-mono text-slate-500">
              Nothing has crystallized yet — the conversation is still molten.
            </p>
            <button
              onClick={dismissCrystallization}
              className="mt-3 px-3 py-1.5 rounded bg-void-700 text-[10px] font-mono text-slate-400 hover:text-slate-200 transition-colors"
            >
              Dismiss
            </button>
          </div>
        )}

        {!crystallizationLoading && result && hasContent && (
          <>
            {result.spatialInsight && (
              <div className="bg-void-900/60 border border-void-700/30 rounded-lg p-3">
                <p className="text-[11px] text-slate-400 italic leading-relaxed">{result.spatialInsight}</p>
              </div>
            )}

            <Section
              title="Core Nodes"
              icon={<Compass size={12} />}
              count={result.coreNodes.length}
              accent="#06b6d4"
            >
              {result.coreNodes.map((node, i) => (
                <CoreNodeCard
                  key={node.title + i}
                  variation={node}
                  index={i}
                  isApplied={crystallizationAppliedNodes.includes(i)}
                  onApply={applyCrystallizationNode}
                />
              ))}
            </Section>

            <Section
              title="Tensions"
              icon={<Zap size={12} />}
              count={result.tensions.length}
              accent="#f43f5e"
            >
              {result.tensions.map((tension, i) => (
                <TensionCard
                  key={tension.title + i}
                  tension={tension}
                  index={i}
                  isApplied={crystallizationAppliedTensions.includes(i)}
                  onApply={applyCrystallizationTension}
                />
              ))}
            </Section>

            <Section
              title="Emergent Themes"
              icon={<span className="text-[10px]">◈</span>}
              count={result.emergentThemes.length}
              accent="#f59e0b"
            >
              {result.emergentThemes.map((theme, i) => (
                <ThemeCard
                  key={theme.label + i}
                  theme={theme}
                  index={i}
                  onNote={noteCrystallizationTheme}
                />
              ))}
            </Section>

            {result.candidateExpansions.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <ArrowRight size={12} className="text-slate-600" />
                  <span className="text-[10px] font-mono uppercase tracking-widest text-slate-600">Adjacent Territories</span>
                </div>
                <div className="pl-1 space-y-1.5">
                  {result.candidateExpansions.map((phrase, i) => (
                    <button
                      key={phrase + i}
                      onClick={() => sendCrystallizationExpansion(phrase)}
                      className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded border border-void-700/40 bg-void-900/40 text-[11px] font-mono text-slate-500 hover:text-slate-300 hover:border-void-600/60 transition-all group text-left"
                    >
                      <span>{phrase}</span>
                      <span className="text-[9px] text-slate-700 group-hover:text-slate-500 transition-colors flex-shrink-0">Explore →</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={dismissCrystallization}
              className="w-full text-center py-2 text-[10px] font-mono text-slate-600 hover:text-slate-400 transition-colors"
            >
              Done
            </button>
          </>
        )}
      </div>
    </div>
  );
}
