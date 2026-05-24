import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Plus, Map } from 'lucide-react';
import { useThoughtStore, MASTER_MAP_ID } from '../store';

function formatDate(iso?: string): string {
  if (!iso) return 'Unknown date';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Unknown date';
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
  const {
    maps,
    createMap,
    switchMap,
    masterMapSearchQuery,
    realms,
    masterMapViewMode,
    masterMapSortMode,
  } = useThoughtStore();

  const filteredMaps = useMemo(() => {
    const query = masterMapSearchQuery.trim().toLowerCase();
    const rank = (m: (typeof maps)[string]) => {
      const mapNodes = Array.isArray(m.nodes) ? m.nodes : [];
      const searchable = [
        m.title,
        m.metadata?.description ?? '',
        ...mapNodes.flatMap((n) => [
          n.title,
          n.content,
          ...(n.tags ?? []),
          ...(Array.isArray(n.realms) ? n.realms : []).map((id) => realms.find((r) => r.id === id)?.name ?? id),
        ]),
      ].join(' ').toLowerCase();
      return searchable.includes(query);
    };

    return Object.values(maps)
      .filter((m) => m.id !== MASTER_MAP_ID)
      .filter((m) => (query ? rank(m) : true));
  }, [maps, masterMapSearchQuery, realms]);

  const userMaps = useMemo(() => {
    const sortedMaps = [...filteredMaps].sort((a, b) => {
      if (masterMapSortMode === 'recently-created') {
        return +new Date(b.createdAt || 0) - +new Date(a.createdAt || 0);
      }
      if (masterMapSortMode === 'alphabetical') {
        return (a.title ?? '').localeCompare(b.title ?? '', undefined, { sensitivity: 'base' });
      }
      if (masterMapSortMode === 'largest') {
        return (b.nodes?.length ?? 0) - (a.nodes?.length ?? 0);
      }
      return +new Date(b.updatedAt || 0) - +new Date(a.updatedAt || 0);
    });
    return sortedMaps;
  }, [filteredMaps, masterMapSortMode]);

  useEffect(() => {
    console.log('[MASTER MAP VIEW]', {
      viewMode: masterMapViewMode,
      sortMode: masterMapSortMode,
      renderedCount: userMaps.length,
      renderedOrder: userMaps.map((m) => m.title),
    });
  }, [masterMapSortMode, masterMapViewMode, userMaps]);

  useEffect(() => {
    if (masterMapViewMode !== 'archive') return;
    console.log('[DOT VIEW DATA]', {
      mapCount: userMaps.length,
      mapDiagnostics: userMaps.map((m) => ({
        id: m.id,
        title: m.title,
        nodesCount: Array.isArray(m.nodes) ? m.nodes.length : 0,
        hasCreatedAt: Boolean(m.createdAt),
        hasUpdatedAt: Boolean(m.updatedAt),
      })),
    });
  }, [masterMapViewMode, userMaps]);

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

        {masterMapViewMode === 'grid' ? (
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
                  <span>{map.nodes?.length ?? 0} {(map.nodes?.length ?? 0) === 1 ? 'node' : 'nodes'}</span>
                  <span>{formatDate(map.updatedAt)}</span>
                </div>
              </button>
            ))}
            <NewMapCard onCreate={handleCreate} />
          </div>
        ) : (
          <div className="space-y-2">
            {userMaps.length === 0 && (
              <div className="rounded-lg border border-void-700 bg-void-800/40 px-4 py-5 text-xs font-mono text-slate-500">
                No archived maps found.
              </div>
            )}
            {userMaps.map((map) => (
              <button
                key={map.id}
                onClick={() => switchMap(map.id)}
                className="w-full rounded-lg border border-void-700 bg-void-800/30 px-4 py-3 text-left hover:border-cosmic-cyan/40 hover:bg-void-800/60 transition-colors"
              >
                <div className="flex items-start gap-2">
                  <Map size={13} className="text-cosmic-cyan mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-200 truncate">{map.title || 'Untitled map'}</p>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{map.metadata?.description || 'No description yet.'}</p>
                    <p className="text-[10px] font-mono text-slate-500 mt-2">
                      Updated {formatDate(map.updatedAt || map.createdAt)} • Created {formatDate(map.createdAt)} • {(map.nodes?.length ?? 0)} {(map.nodes?.length ?? 0) === 1 ? 'node' : 'nodes'}
                    </p>
                  </div>
                </div>
              </button>
            ))}
            <NewMapCard onCreate={handleCreate} />
          </div>
        )}
      </div>
    </div>
  );
}
