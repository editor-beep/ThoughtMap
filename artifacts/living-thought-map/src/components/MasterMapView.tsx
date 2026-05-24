import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Plus, Map } from 'lucide-react';
import { useThoughtStore, MASTER_MAP_ID } from '../store';

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function NewMapCard({ onCreate }: { onCreate: (title: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const commit = () => {
    const trimmed = value.trim();
    if (trimmed) onCreate(trimmed);
    setValue('');
    setEditing(false);
  };

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-void-600 bg-void-900/40 p-6 text-slate-500 hover:border-cosmic-cyan/50 hover:text-cosmic-cyan transition-colors min-h-[120px]"
      >
        <Plus size={20} />
        <span className="text-xs font-mono uppercase tracking-wider">New Map</span>
      </button>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-cosmic-cyan/40 bg-void-900/60 p-6 min-h-[120px]">
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') { setValue(''); setEditing(false); }
        }}
        placeholder="Map name…"
        className="w-full bg-transparent border-b border-cosmic-cyan/60 text-sm text-slate-200 placeholder-slate-600 outline-none text-center pb-1"
      />
      <span className="text-[10px] text-slate-600 font-mono">Enter to create</span>
    </div>
  );
}

export default function MasterMapView() {
  const { maps, createMap, switchMap, masterMapSearchQuery, realms } = useThoughtStore();

  const userMaps = useMemo(() => {
    const query = masterMapSearchQuery.trim().toLowerCase();
    const rank = (m: (typeof maps)[string]) => {
      const searchable = [
        m.title,
        m.metadata?.description ?? '',
        ...m.nodes.flatMap((n) => [
          n.title,
          n.content,
          ...(n.tags ?? []),
          ...n.realms.map((id) => realms.find((r) => r.id === id)?.name ?? id),
        ]),
      ].join(' ').toLowerCase();
      return searchable.includes(query);
    };

    return Object.values(maps)
      .filter((m) => m.id !== MASTER_MAP_ID)
      .filter((m) => (query ? rank(m) : true))
      .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));
  }, [maps, masterMapSearchQuery, realms]);

  const handleCreate = (title: string) => {
    const newId = createMap(title, MASTER_MAP_ID);
    switchMap(newId);
  };

  return (
    <div className="w-full h-full overflow-y-auto bg-void-900">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-lg font-mono text-slate-200 tracking-wide">Master Map</h1>
          <p className="text-xs text-slate-500 mt-1 font-mono">Your worlds and archives</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {userMaps.map((map) => (
            <button
              key={map.id}
              onClick={() => switchMap(map.id)}
              className="flex flex-col gap-3 rounded-lg border border-void-700 bg-void-800/50 p-5 text-left hover:border-cosmic-cyan/40 hover:bg-void-800 transition-colors min-h-[120px]"
            >
              <div className="flex items-start gap-2">
                <Map size={14} className="text-cosmic-cyan mt-0.5 shrink-0" />
                <span className="text-sm text-slate-200 font-medium leading-snug">{map.title}</span>
              </div>
              <div className="mt-auto flex items-center justify-between text-[10px] font-mono text-slate-500">
                <span>{map.nodes.length} {map.nodes.length === 1 ? 'node' : 'nodes'}</span>
                <span>{formatDate(map.updatedAt)}</span>
              </div>
            </button>
          ))}
          <NewMapCard onCreate={handleCreate} />
        </div>
      </div>
    </div>
  );
}
