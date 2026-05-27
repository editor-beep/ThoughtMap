import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Plus, Map, Link2, X } from 'lucide-react';
import { useThoughtStore, MASTER_MAP_ID } from '../store';
import { MapDocument } from '../types';

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

interface MapCardProps {
  map: MapDocument;
  allMaps: Record<string, MapDocument>;
  onOpen: () => void;
  onLinkToNode: (parentNodeId: string, parentNodeMapId: string) => void;
  onDecouple: () => void;
  isGrid: boolean;
}

function MapCard({ map, allMaps, onOpen, onLinkToNode, onDecouple, isGrid }: MapCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [nodePickerOpen, setNodePickerOpen] = useState(false);
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointerDownPos = useRef<{ x: number; y: number } | null>(null);

  const isLinked = Boolean(map.parentNodeId);

  const allNodes = useMemo(() => {
    return Object.values(allMaps)
      .filter((m) => m.id !== MASTER_MAP_ID && m.id !== map.id)
      .flatMap((m) => (m.nodes ?? []).map((n) => ({ node: n, mapId: m.id, mapTitle: m.title })));
  }, [allMaps, map.id]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    pointerDownPos.current = { x: e.clientX, y: e.clientY };
    longPressRef.current = setTimeout(() => {
      setMenuOpen(true);
      longPressRef.current = null;
    }, 500);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!pointerDownPos.current || !longPressRef.current) return;
    const dx = e.clientX - pointerDownPos.current.x;
    const dy = e.clientY - pointerDownPos.current.y;
    if (Math.sqrt(dx * dx + dy * dy) > 6) {
      clearTimeout(longPressRef.current);
      longPressRef.current = null;
    }
  };

  const handlePointerUp = () => {
    if (longPressRef.current) {
      clearTimeout(longPressRef.current);
      longPressRef.current = null;
    }
    pointerDownPos.current = null;
  };

  useEffect(() => () => { if (longPressRef.current) clearTimeout(longPressRef.current); }, []);

  const linkedNode = isLinked && map.parentMapId
    ? (allMaps[map.parentMapId]?.nodes ?? []).find((n) => n.id === map.parentNodeId)
    : null;
  const linkedMapTitle = isLinked && map.parentMapId ? allMaps[map.parentMapId]?.title : null;

  const cardBase = `relative flex flex-col rounded-lg border border-void-700 bg-void-800/50 text-left hover:border-cosmic-cyan/40 hover:bg-void-800 transition-colors`;

  return (
    <div
      className={isGrid ? `${cardBase} gap-2 p-5 min-h-[120px]` : `${cardBase} px-4 py-3`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      {/* Main clickable area */}
      <button
        className="text-left flex-1 min-w-0 w-full"
        onClick={onOpen}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {isGrid ? (
          <>
            <div className="flex items-start gap-2">
              <Map size={14} className="text-cosmic-cyan mt-0.5 shrink-0" />
              <span className="text-sm text-slate-200 font-medium leading-snug">{map.title}</span>
            </div>
            {isLinked && linkedNode && (
              <p className="text-[9px] font-mono text-cosmic-cyan/60 mt-1 truncate">
                ↗ {linkedNode.title}{linkedMapTitle ? ` · ${linkedMapTitle}` : ''}
              </p>
            )}
            <div className="mt-auto flex items-center justify-between text-[10px] font-mono text-slate-500 pt-2">
              <span>{map.nodes?.length ?? 0} {(map.nodes?.length ?? 0) === 1 ? 'node' : 'nodes'}</span>
              <span>{formatDate(map.updatedAt)}</span>
            </div>
          </>
        ) : (
          <div className="flex items-start gap-2">
            <Map size={13} className="text-cosmic-cyan mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-200 truncate">{map.title || 'Untitled map'}</p>
              {isLinked && linkedNode ? (
                <p className="text-[9px] font-mono text-cosmic-cyan/60 mt-0.5 truncate">
                  ↗ {linkedNode.title}{linkedMapTitle ? ` · ${linkedMapTitle}` : ''}
                </p>
              ) : (
                <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{map.metadata?.description || 'No description yet.'}</p>
              )}
              <p className="text-[10px] font-mono text-slate-500 mt-2">
                Updated {formatDate(map.updatedAt || map.createdAt)} • Created {formatDate(map.createdAt)} • {(map.nodes?.length ?? 0)} {(map.nodes?.length ?? 0) === 1 ? 'node' : 'nodes'}
              </p>
            </div>
          </div>
        )}
      </button>

      {/* Link-to-node footer */}
      <button
        className="w-full flex items-center justify-center gap-1 text-[9px] font-mono text-slate-600 hover:text-cosmic-cyan hover:bg-void-700/40 rounded py-1 transition-colors"
        onClick={(e) => { e.stopPropagation(); setNodePickerOpen(true); }}
        onPointerDown={(e) => e.stopPropagation()}
        title="Link to a node"
      >
        <Link2 size={9} /> link to node
      </button>

      {/* Long-press context menu */}
      {menuOpen && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center rounded-lg"
          style={{ backgroundColor: 'rgba(10,10,20,0.88)', backdropFilter: 'blur(4px)' }}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex flex-col items-center gap-1.5 px-3 py-2 w-full">
            {isLinked && (
              <button
                className="w-full flex items-center gap-2 px-3 py-1.5 rounded bg-void-700/80 border border-cosmic-rose/30 text-[11px] font-mono text-cosmic-rose hover:bg-cosmic-rose/10 transition-colors"
                onClick={() => { onDecouple(); setMenuOpen(false); }}
              >
                <X size={11} /> Decouple from node
              </button>
            )}
            <button
              className="w-full flex items-center gap-2 px-3 py-1.5 rounded bg-void-700/80 border border-void-600/60 text-[11px] font-mono text-slate-200 hover:bg-void-600 transition-colors"
              onClick={() => { setMenuOpen(false); setNodePickerOpen(true); }}
            >
              <Link2 size={11} className="text-cosmic-cyan" /> Link to node
            </button>
            <button
              className="mt-1 text-[9px] font-mono text-slate-600 hover:text-slate-400 transition-colors"
              onClick={() => setMenuOpen(false)}
            >
              cancel
            </button>
          </div>
        </div>
      )}

      {/* Node picker overlay */}
      {nodePickerOpen && (
        <div
          className="absolute inset-0 z-50 flex flex-col rounded-lg overflow-hidden"
          style={{ backgroundColor: 'rgba(10,10,20,0.92)', backdropFilter: 'blur(4px)' }}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 pt-2 pb-1 flex items-center justify-between shrink-0">
            <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">Link to node</span>
            <button
              className="text-[9px] font-mono text-slate-600 hover:text-slate-400 transition-colors"
              onClick={() => setNodePickerOpen(false)}
            >
              <X size={11} />
            </button>
          </div>
          <div className="overflow-y-auto flex-1 px-2 pb-2 flex flex-col gap-0.5">
            {allNodes.length === 0 ? (
              <p className="text-[10px] font-mono text-slate-600 italic p-2">No nodes available</p>
            ) : (
              allNodes.map(({ node, mapId, mapTitle }) => (
                <button
                  key={node.id}
                  className="text-left w-full px-2 py-1.5 rounded hover:bg-void-700/60 transition-colors"
                  onClick={() => { onLinkToNode(node.id, mapId); setNodePickerOpen(false); }}
                >
                  <p className="text-[10px] font-mono text-slate-200 truncate">{node.title}</p>
                  <p className="text-[9px] font-mono text-slate-600 truncate">{mapTitle}</p>
                </button>
              ))
            )}
          </div>
        </div>
      )}
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
    linkMapToNode,
    decoupleMapFromNode,
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
              <MapCard
                key={map.id}
                map={map}
                allMaps={maps}
                onOpen={() => switchMap(map.id)}
                onLinkToNode={(parentNodeId, parentNodeMapId) =>
                  linkMapToNode(map.id, parentNodeId, parentNodeMapId)
                }
                onDecouple={() => decoupleMapFromNode(map.id)}
                isGrid
              />
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
              <MapCard
                key={map.id}
                map={map}
                allMaps={maps}
                onOpen={() => switchMap(map.id)}
                onLinkToNode={(parentNodeId, parentNodeMapId) =>
                  linkMapToNode(map.id, parentNodeId, parentNodeMapId)
                }
                onDecouple={() => decoupleMapFromNode(map.id)}
                isGrid={false}
              />
            ))}
            <NewMapCard onCreate={handleCreate} />
          </div>
        )}
      </div>
    </div>
  );
}
