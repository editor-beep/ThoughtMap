import React from 'react';
import type { EdgeType, ThoughtEdge } from '../types';
import { EDGE_TYPES } from '../lib/constants';
import { EDGE_COLORS, EDGE_LABELS } from '../lib/canvasTheme';

/** Modal shown after a connection is dragged, to pick the new edge's type. */
export function EdgeTypePicker({ onSelect, onCancel }: {
  onSelect: (type: EdgeType) => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="absolute inset-0 z-40 flex items-center justify-center bg-void-900/50 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="bg-void-800 border border-void-700 rounded-lg p-4 w-60 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="font-mono text-[10px] uppercase tracking-widest text-slate-400 mb-3">Define Connection</div>
        <div className="space-y-1">
          {(Object.entries(EDGE_LABELS) as [EdgeType, string][]).map(([type, label]) => (
            <button
              key={type}
              onClick={() => onSelect(type)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded font-mono text-xs hover:bg-void-700 transition-colors text-left"
            >
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: EDGE_COLORS[type] }} />
              <span className="text-slate-300">{label}</span>
            </button>
          ))}
        </div>
        <button
          onClick={onCancel}
          className="mt-3 w-full text-center font-mono text-[10px] text-slate-600 hover:text-slate-400 py-1 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

/** Floating toolbar over a selected edge: retype or delete it. */
export function EdgeActionToolbar({ edge, position, onChangeType, onDelete }: {
  edge: ThoughtEdge;
  position: { left: number; top: number };
  onChangeType: (id: string, type: EdgeType) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div
      className="absolute z-40 -translate-x-1/2 -translate-y-1/2 rounded-lg border border-void-700 bg-void-900/95 px-2 py-2 shadow-xl backdrop-blur-sm flex items-center gap-2"
      style={{ left: position.left, top: position.top }}
      onClick={(event) => event.stopPropagation()}
    >
      <span className="text-[10px] font-mono text-slate-500">{EDGE_LABELS[edge.type]}</span>
      <select
        value={edge.type}
        onChange={(event) => onChangeType(edge.id, event.target.value as EdgeType)}
        className="bg-void-800 border border-void-700 rounded px-1.5 py-1 text-[10px] font-mono text-slate-300"
      >
        {EDGE_TYPES.map((type) => (
          <option key={type} value={type}>{EDGE_LABELS[type]}</option>
        ))}
      </select>
      <button
        onClick={() => {
          console.log('[EDGE DELETE]', edge.id);
          onDelete(edge.id);
        }}
        className="rounded border border-rose-700/60 bg-rose-900/20 px-2 py-1 text-[10px] font-mono text-rose-300 hover:bg-rose-800/30"
      >
        Delete
      </button>
    </div>
  );
}
