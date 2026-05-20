import React, { useMemo, useState } from 'react';
import { useThoughtStore } from '../store';
import { Compass, Layers, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import SanctumModal from './SanctumModal';

const TERRAIN_NAMES: Record<string, string> = {
  'memory-palace':      'Memory Palace',
  'interstellar-plane': 'Interstellar',
  'terrestrial-globe':  'Terrestrial',
  'mythic-landscape':   'Mythic',
  'the-void':           'The Void',
};

export default function ContextHistoryRail() {
  const { realms, toggleRealm, nodes, deleteNode, focusNode, activeTerrain } = useThoughtStore();
  const [isSanctumOpen, setIsSanctumOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const realmCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    realms.forEach((r) => {
      counts[r.id] = nodes.filter((n) => n.realms.includes(r.id)).length;
    });
    return counts;
  }, [realms, nodes]);

  if (collapsed) {
    return (
      <aside className="w-10 h-full bg-void-900/90 flex flex-col items-center py-4 border-r border-void-800/40 gap-3 flex-shrink-0">
        <button
          onClick={() => setCollapsed(false)}
          className="p-1.5 rounded hover:bg-void-800/60 text-slate-500 hover:text-slate-300 transition-colors"
          title="Expand panel"
        >
          <ChevronRight size={13} />
        </button>
        <div className="flex flex-col gap-2 mt-2">
          {realms.map((r) => (
            <div
              key={r.id}
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: r.isActive ? r.color : '#1e293b' }}
              title={r.name}
            />
          ))}
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-56 h-full bg-void-900/90 flex flex-col justify-between p-4 border-r border-void-800/40 select-none flex-shrink-0">
      <div className="min-h-0 flex flex-col">
        <div className="flex items-center justify-between mb-8 px-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-cosmic-cyan animate-pulse" />
            <h1 className="font-mono text-xs tracking-widest uppercase text-slate-400">Thought Map</h1>
          </div>
          <button
            onClick={() => setCollapsed(true)}
            className="p-1 rounded hover:bg-void-800/60 text-slate-600 hover:text-slate-400 transition-colors"
            title="Collapse panel"
          >
            <ChevronLeft size={12} />
          </button>
        </div>

        <section className="mb-8">
          <div className="text-[10px] font-mono tracking-wider text-slate-500 uppercase mb-3 px-2">Symbolic Realms</div>
          <div className="space-y-1">
            {realms.map((realm) => (
              <button
                key={realm.id}
                onClick={() => toggleRealm(realm.id)}
                className={`w-full flex items-center justify-between px-2 py-1.5 rounded font-mono text-xs transition-all ${
                  realm.isActive ? 'text-slate-200 bg-void-800/60' : 'text-slate-600 hover:text-slate-400'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span style={{ color: realm.isActive ? realm.color : '#475569' }}>{realm.symbol}</span>
                  <span>{realm.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  {realmCounts[realm.id] > 0 && (
                    <span
                      className="text-[9px] font-mono tabular-nums"
                      style={{ color: realm.isActive ? realm.color : '#475569' }}
                    >
                      {realmCounts[realm.id]}
                    </span>
                  )}
                  <div
                    className="w-1 h-1 rounded-full"
                    style={{ backgroundColor: realm.isActive ? realm.color : 'transparent' }}
                  />
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="min-h-0 flex flex-col">
          <div className="text-[10px] font-mono tracking-wider text-slate-500 uppercase mb-3 px-2">
            Active Anchors
            {nodes.length > 0 && (
              <span className="text-slate-600 ml-1">({nodes.length})</span>
            )}
          </div>
          <div className="overflow-y-auto space-y-0.5 pr-1">
            {nodes.length === 0 ? (
              <div className="text-xs italic text-slate-600 font-mono px-2">No nodes anchored.</div>
            ) : (
              nodes.map((n) => (
                <div
                  key={n.id}
                  className="group flex items-center gap-1.5 px-2 py-1.5 rounded hover:bg-void-800/60 cursor-pointer transition-colors"
                  onClick={() => focusNode(n.id)}
                >
                  <span className="text-cosmic-cyan/50 text-[10px] font-mono flex-shrink-0">#</span>
                  <span className="text-xs font-mono text-slate-400 group-hover:text-slate-200 truncate flex-1 transition-colors">
                    {n.title}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteNode(n.id); }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-600 hover:text-cosmic-rose p-0.5 rounded flex-shrink-0"
                    title="Delete node"
                  >
                    <Trash2 size={9} />
                  </button>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <div className="flex-shrink-0 border-t border-void-800/60">
        <button
          onClick={() => setIsSanctumOpen(true)}
          className="w-full flex items-center gap-2 px-4 py-2.5 font-mono text-[10px] tracking-widest uppercase text-slate-500 hover:text-slate-300 hover:bg-void-800/60 transition-all"
        >
          <Layers size={11} />
          <span>Sanctum</span>
          <span className="ml-auto text-slate-600 normal-case tracking-normal">{TERRAIN_NAMES[activeTerrain]}</span>
        </button>
        <div className="px-4 py-2 flex items-center gap-2 text-[11px] font-mono text-slate-600">
          <Compass size={12} />
          <span>V0.1.0 // Spatial Dominance</span>
        </div>
      </div>

      {isSanctumOpen && <SanctumModal onClose={() => setIsSanctumOpen(false)} />}
    </aside>
  );
}
