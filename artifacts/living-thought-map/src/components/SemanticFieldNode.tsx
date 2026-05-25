import React from 'react';
import { ThoughtNode } from '../types';

export default function SemanticFieldNode({ data }: { data: { node: ThoughtNode; onOpen?: (nodeId: string) => void; emphasis?: 'default' | 'focused' | 'neighborhood' | 'background'; cardScale?: 'compact' | 'standard' | 'large' } }) {
  const { node, onOpen } = data;
  const emphasis = data.emphasis ?? 'default';
  const scale = data.cardScale === 'compact' ? 0.92 : data.cardScale === 'large' ? 1.08 : 1;
  return (
    <div className="min-w-[340px] rounded-2xl border-2 border-cyan-400/70 bg-void-900/80 p-4 shadow-[0_0_0_2px_rgba(34,211,238,0.25),0_0_28px_rgba(34,211,238,0.35)] transition-all duration-200" style={{ opacity: emphasis === 'background' ? 0.25 : emphasis === 'neighborhood' ? 0.9 : 1, transform: `scale(${emphasis === 'focused' ? scale * 1.06 : scale})` }}>
      <h3 className="text-cyan-200 font-semibold">{node.title}</h3>
      <p className="text-xs text-slate-400 mt-1">{node.content || 'Semantic field portal'}</p>
      <button
        className="mt-3 rounded-md border border-cyan-400/50 px-3 py-1 text-xs text-cyan-100 hover:bg-cyan-500/10"
        onClick={() => onOpen?.(node.id)}
      >
        Open
      </button>
    </div>
  );
}
