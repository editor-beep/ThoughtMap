import React from 'react';
import { useThoughtStore } from '@core/store';
import { Compass } from 'lucide-react';

export default function ContextHistoryRail() {
  const { realms, toggleRealm, nodes } = useThoughtStore();

  return (
    <aside className="w-64 h-full bg-void-900/90 flex flex-col justify-between p-4 border-r border-void-800/40 select-none">
      <div>
        <div className="flex items-center gap-2 mb-8 px-2">
          <div className="w-2 h-2 rounded-full bg-cosmic-cyan animate-pulse" />
          <h1 className="font-mono text-xs tracking-widest uppercase text-slate-400">Thought Map Shell</h1>
        </div>

        <section className="mb-8">
          <div className="text-[10px] font-mono tracking-wider text-slate-500 uppercase mb-3 px-2">Symbolic Realms</div>
          <div className="space-y-1">
            {realms.map((realm) => (
              <button
                key={realm.id}
                onClick={() => toggleRealm(realm.id)}
                className={`w-full flex items-center justify-between px-2 py-1.5 rounded font-mono text-xs transition-all ${
                  realm.isActive ? 'text-slate-200 bg-void-800/60 shadow-glow-cyan/5' : 'text-slate-600 hover:text-slate-400'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span style={{ color: realm.isActive ? realm.color : '#475569' }}>{realm.symbol}</span>
                  <span>{realm.name}</span>
                </div>
                <div className="w-1 h-1 rounded-full" style={{ backgroundColor: realm.isActive ? realm.color : 'transparent' }} />
              </button>
            ))}
          </div>
        </section>

        <section>
          <div className="text-[10px] font-mono tracking-wider text-slate-500 uppercase mb-3 px-2">Active Anchors</div>
          <div className="max-h-60 overflow-y-auto space-y-1 px-2">
            {nodes.length === 0 ? (
              <div className="text-xs italic text-slate-600 font-mono">No nodes anchored.</div>
            ) : (
              nodes.map((n) => (
                <div key={n.id} className="text-xs font-mono text-slate-400 truncate flex items-center gap-1.5">
                  <span className="text-cosmic-cyan/60">#</span> {n.title}
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <div className="p-2 border-t border-void-800/60 flex items-center gap-2 text-[11px] font-mono text-slate-500">
        <Compass size={12} />
        <span>V0.1.0 // Spatial Dominance</span>
      </div>
    </aside>
  );
}
