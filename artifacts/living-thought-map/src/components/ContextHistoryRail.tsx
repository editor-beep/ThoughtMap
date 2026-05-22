import React, { useMemo, useRef, useState } from 'react';
import { useThoughtStore } from '../store';
import { Compass, Layers, Trash2, ChevronLeft, ChevronRight, Download, Upload, Search } from 'lucide-react';
import SanctumModal from './SanctumModal';

const TERRAIN_NAMES: Record<string, string> = {
  'memory-palace':      'Memory Palace',
  'interstellar-plane': 'Interstellar',
  'terrestrial-globe':  'Terrestrial',
  'mythic-landscape':   'Mythic',
  'the-void':           'The Void',
};

export default function ContextHistoryRail() {
  const { realms, toggleRealm, nodes, edges, deleteNode, focusNode, activeTerrain, importMap, undo, undoStack } = useThoughtStore();
  const [isSanctumOpen, setIsSanctumOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [nodeSearch, setNodeSearch] = useState('');
  const importInputRef = useRef<HTMLInputElement>(null);

  const filteredNodes = useMemo(() => {
    const q = nodeSearch.trim().toLowerCase();
    return q ? nodes.filter((n) => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q)) : nodes;
  }, [nodes, nodeSearch]);

  const handleExport = () => {
    const data = { nodes, edges, realms };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `thought-map-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (data.nodes && data.edges && data.realms) {
          importMap(data);
        }
      } catch {
        console.warn('[ThoughtMap] Failed to parse imported file');
      }
    };
    reader.readAsText(file);
    // reset input so the same file can be re-imported
    e.target.value = '';
  };

  const realmCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    realms.forEach((r) => {
      counts[r.id] = nodes.filter((n) => n.realms.includes(r.id)).length;
    });
    return counts;
  }, [realms, nodes]);

  if (collapsed) {
    return (
      <aside className="hidden md:flex w-10 h-full bg-void-900/90 flex-col items-center py-4 border-r border-void-800/40 gap-3 flex-shrink-0">
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
    <aside className="hidden md:flex w-56 h-full bg-void-900/90 flex-col justify-between p-4 border-r border-void-800/40 select-none flex-shrink-0">
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
          <div className="text-[10px] font-mono tracking-wider text-slate-500 uppercase mb-2 px-2">
            Active Anchors
            {nodes.length > 0 && (
              <span className="text-slate-600 ml-1">({nodes.length})</span>
            )}
          </div>
          {nodes.length > 3 && (
            <div className="relative mb-2 px-1">
              <Search size={10} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" />
              <input
                type="text"
                value={nodeSearch}
                onChange={(e) => setNodeSearch(e.target.value)}
                placeholder="Search nodes…"
                className="w-full bg-void-800/60 border border-void-700/60 rounded-md pl-6 pr-3 py-1 text-[11px] font-mono text-slate-400 placeholder:text-slate-600 focus:outline-none focus:border-cosmic-cyan/50 transition-colors"
              />
            </div>
          )}
          <div className="overflow-y-auto space-y-0.5 pr-1">
            {nodes.length === 0 ? (
              <div className="text-xs italic text-slate-600 font-mono px-2">No nodes anchored.</div>
            ) : filteredNodes.length === 0 ? (
              <div className="text-xs italic text-slate-600 font-mono px-2">No matches.</div>
            ) : (
              filteredNodes.map((n) => (
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
        {/* Export / Import / Undo row */}
        <div className="flex items-center gap-1 px-3 py-2 border-b border-void-800/40">
          <button
            onClick={handleExport}
            title="Export map as JSON"
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded font-mono text-[10px] text-slate-500 hover:text-slate-300 hover:bg-void-800/60 transition-all"
          >
            <Download size={10} />
            <span>Export</span>
          </button>
          <button
            onClick={() => importInputRef.current?.click()}
            title="Import map from JSON"
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded font-mono text-[10px] text-slate-500 hover:text-slate-300 hover:bg-void-800/60 transition-all"
          >
            <Upload size={10} />
            <span>Import</span>
          </button>
          <button
            onClick={undo}
            disabled={undoStack.length === 0}
            title="Undo last deletion (⌘Z)"
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded font-mono text-[10px] text-slate-500 hover:text-slate-300 hover:bg-void-800/60 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <span>↩ Undo</span>
          </button>
          <input
            ref={importInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleImportFile}
          />
        </div>
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
