import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useThoughtStore } from '../store';
import { Search, X, ChevronDown, Download, Upload, Info, Trash2 } from 'lucide-react';
import SanctumModal from './SanctumModal';
import type { TerrainId } from '../types';

const TERRAIN_NAMES: Record<TerrainId, string> = {
  'memory-palace':      'Memory Palace',
  'interstellar-plane': 'Interstellar Plane',
  'terrestrial-globe':  'Terrestrial Globe',
  'mythic-landscape':   'Mythic Landscape',
  'the-void':           'The Void',
};

const TERRAIN_COLORS: Record<TerrainId, string> = {
  'memory-palace':      '#f59e0b',
  'interstellar-plane': '#a855f7',
  'terrestrial-globe':  '#06b6d4',
  'mythic-landscape':   '#10b981',
  'the-void':           '#475569',
};

type DropdownId = 'anchors' | 'realms' | 'sanctum' | 'exportimport';

interface DropdownButtonProps {
  label: React.ReactNode;
  badge?: React.ReactNode;
  isOpen: boolean;
  onClick: () => void;
}

function DropdownButton({ label, badge, isOpen, onClick }: DropdownButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded font-mono text-[11px] transition-colors ${
        isOpen ? 'text-slate-200 bg-void-800' : 'text-slate-400 hover:text-slate-200 hover:bg-void-800/60'
      }`}
    >
      {label}
      {badge}
      <ChevronDown
        size={10}
        className={`transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`}
      />
    </button>
  );
}

export default function TopNav() {
  const {
    nodes, edges, realms,
    toggleRealm, addRealm, focusNode, deleteNode, addNode,
    activeTerrain, setTerrain,
    importMap,
    setNodeSearchQuery,
  } = useThoughtStore();

  const [nodeSearch, setNodeSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<DropdownId | null>(null);
  const [isSanctumModalOpen, setIsSanctumModalOpen] = useState(false);
  const [newRealmInput, setNewRealmInput] = useState('');
  const [showNewRealmInput, setShowNewRealmInput] = useState(false);
  const [showNewAnchorInput, setShowNewAnchorInput] = useState(false);
  const [newAnchorTitle, setNewAnchorTitle] = useState('');
  const [newAnchorNote, setNewAnchorNote] = useState('');

  const importInputRef = useRef<HTMLInputElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const newRealmInputRef = useRef<HTMLInputElement>(null);
  const newAnchorInputRef = useRef<HTMLInputElement>(null);

  // Sync local search to store for canvas highlighting
  useEffect(() => {
    setNodeSearchQuery(nodeSearch.trim().toLowerCase());
  }, [nodeSearch, setNodeSearchQuery]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
        setShowNewRealmInput(false);
        setNewRealmInput('');
        setShowNewAnchorInput(false);
        setNewAnchorTitle('');
        setNewAnchorNote('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close dropdowns on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenDropdown(null);
        setShowNewRealmInput(false);
        setNewRealmInput('');
        setShowNewAnchorInput(false);
        setNewAnchorTitle('');
        setNewAnchorNote('');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Focus new realm input when it appears
  useEffect(() => {
    if (showNewRealmInput) {
      newRealmInputRef.current?.focus();
    }
  }, [showNewRealmInput]);

  // Focus anchor title input when it appears
  useEffect(() => {
    if (showNewAnchorInput) {
      newAnchorInputRef.current?.focus();
    }
  }, [showNewAnchorInput]);

  const filteredNodes = useMemo(() => {
    const q = nodeSearch.trim().toLowerCase();
    return q
      ? nodes.filter((n) => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q))
      : nodes;
  }, [nodes, nodeSearch]);

  const realmCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    realms.forEach((r) => {
      counts[r.id] = nodes.filter((n) => n.realms.includes(r.id)).length;
    });
    return counts;
  }, [realms, nodes]);

  const anchorNodes = useMemo(() => nodes.filter((n) => n.isAnchor), [nodes]);

  const filteredAnchorNodes = useMemo(() => {
    const q = nodeSearch.trim().toLowerCase();
    return q
      ? anchorNodes.filter((n) => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q))
      : anchorNodes;
  }, [anchorNodes, nodeSearch]);

  const toggleDropdown = (id: DropdownId) => {
    setOpenDropdown((prev) => (prev === id ? null : id));
    if (id !== 'realms') {
      setShowNewRealmInput(false);
      setNewRealmInput('');
    }
    if (id !== 'anchors') {
      setShowNewAnchorInput(false);
      setNewAnchorTitle('');
      setNewAnchorNote('');
    }
  };

  const handleExport = () => {
    const data = { nodes, edges, realms };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `thought-map-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setOpenDropdown(null);
  };

  const handleImportClick = () => {
    importInputRef.current?.click();
    setOpenDropdown(null);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (data.nodes && data.edges && data.realms) importMap(data);
      } catch {
        console.warn('[ThoughtMap] Failed to parse imported file');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleAddRealm = () => {
    const trimmed = newRealmInput.trim();
    if (!trimmed) return;
    addRealm(trimmed);
    setNewRealmInput('');
    setShowNewRealmInput(false);
  };

  const handleFocusNode = (id: string) => {
    focusNode(id);
    setOpenDropdown(null);
  };

  const handleAddAnchor = () => {
    const trimmed = newAnchorTitle.trim();
    if (!trimmed) return;
    const id = addNode({
      title: trimmed,
      content: newAnchorNote.trim(),
      type: 'thought',
      isAnchor: true,
      realms: [],
      x: 0,
      y: 0,
    });
    focusNode(id);
    setNewAnchorTitle('');
    setNewAnchorNote('');
    setShowNewAnchorInput(false);
    setOpenDropdown(null);
  };

  return (
    <nav
      ref={navRef}
      className="relative flex-shrink-0 h-11 bg-void-900/95 border-b border-void-800/60 flex items-center px-3 gap-0.5 z-40 backdrop-blur-sm"
    >
      {/* ── Search ── */}
      <div className="relative flex-shrink-0">
        <Search
          size={10}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none"
        />
        <input
          type="text"
          value={nodeSearch}
          onChange={(e) => setNodeSearch(e.target.value)}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          placeholder="Search nodes…"
          className={`bg-void-800/60 border border-void-700/50 rounded pl-6 ${nodeSearch ? 'pr-6' : 'pr-2'} py-1 text-[11px] font-mono text-slate-400 placeholder:text-slate-600 focus:outline-none focus:border-cosmic-cyan/50 transition-all duration-200 ${searchFocused || nodeSearch ? 'w-60' : 'w-[120px]'}`}
        />
        {nodeSearch && (
          <button
            onClick={() => setNodeSearch('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-300 transition-colors"
          >
            <X size={10} />
          </button>
        )}
      </div>

      <div className="w-px h-5 bg-void-700/50 mx-1.5 flex-shrink-0" />

      {/* ── Active Anchors ── */}
      <div className="relative flex-shrink-0">
        <DropdownButton
          label="Anchors"
          badge={
            <span className="bg-void-800 border border-void-700/50 rounded px-1 py-px text-[9px] text-slate-500 font-mono tabular-nums">
              {anchorNodes.length}
            </span>
          }
          isOpen={openDropdown === 'anchors'}
          onClick={() => toggleDropdown('anchors')}
        />
        {openDropdown === 'anchors' && (
          <div className="absolute top-full left-0 mt-1 w-60 bg-void-900 border border-void-700/60 rounded-lg shadow-2xl overflow-hidden">
            {anchorNodes.length === 0 ? (
              <div className="px-3 py-3 text-xs font-mono text-slate-600 italic">No anchors yet.</div>
            ) : filteredAnchorNodes.length === 0 ? (
              <div className="px-3 py-3 text-xs font-mono text-slate-600 italic">No matches.</div>
            ) : (
              <div className="max-h-64 overflow-y-auto">
                {filteredAnchorNodes.map((n) => (
                  <div
                    key={n.id}
                    className="group flex items-center gap-2 px-3 py-2 hover:bg-void-800/60 cursor-pointer transition-colors"
                    onClick={() => handleFocusNode(n.id)}
                  >
                    <span className="text-cosmic-cyan/50 text-[10px] font-mono flex-shrink-0">#</span>
                    <span className="text-xs font-mono text-slate-400 group-hover:text-slate-200 truncate flex-1 transition-colors">
                      {n.title}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteNode(n.id); }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-600 hover:text-red-400 p-0.5 rounded flex-shrink-0"
                      title="Delete node"
                    >
                      <Trash2 size={9} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="border-t border-void-700/40">
              {showNewAnchorInput ? (
                <div className="p-2 space-y-1.5">
                  <input
                    ref={newAnchorInputRef}
                    type="text"
                    value={newAnchorTitle}
                    onChange={(e) => setNewAnchorTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddAnchor();
                      if (e.key === 'Escape') { setShowNewAnchorInput(false); setNewAnchorTitle(''); setNewAnchorNote(''); }
                      e.stopPropagation();
                    }}
                    placeholder="Anchor title…"
                    className="w-full bg-void-800/60 border border-void-700/60 rounded px-2 py-1 text-[11px] font-mono text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-cosmic-cyan/50 min-w-0"
                  />
                  <input
                    type="text"
                    value={newAnchorNote}
                    onChange={(e) => setNewAnchorNote(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddAnchor();
                      if (e.key === 'Escape') { setShowNewAnchorInput(false); setNewAnchorTitle(''); setNewAnchorNote(''); }
                      e.stopPropagation();
                    }}
                    placeholder="Note (optional)…"
                    className="w-full bg-void-800/60 border border-void-700/60 rounded px-2 py-1 text-[11px] font-mono text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-cosmic-cyan/50 min-w-0"
                  />
                  <div className="flex gap-1 justify-end">
                    <button
                      onClick={handleAddAnchor}
                      disabled={!newAnchorTitle.trim()}
                      className="text-cosmic-cyan hover:text-cosmic-cyan/80 text-xs font-mono px-2 py-0.5 disabled:opacity-40 transition-colors"
                    >
                      ✓
                    </button>
                    <button
                      onClick={() => { setShowNewAnchorInput(false); setNewAnchorTitle(''); setNewAnchorNote(''); }}
                      className="text-slate-600 hover:text-slate-300 text-xs font-mono px-2 py-0.5 transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowNewAnchorInput(true)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-mono text-slate-500 hover:text-slate-300 hover:bg-void-800/40 transition-colors"
                >
                  ＋ Add anchor
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Realms ── */}
      <div className="relative flex-shrink-0">
        <DropdownButton
          label="Realms"
          isOpen={openDropdown === 'realms'}
          onClick={() => toggleDropdown('realms')}
        />
        {openDropdown === 'realms' && (
          <div className="absolute top-full left-0 mt-1 w-52 bg-void-900 border border-void-700/60 rounded-lg shadow-2xl overflow-hidden">
            {realms.map((realm) => (
              <button
                key={realm.id}
                onClick={() => toggleRealm(realm.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-mono transition-colors ${
                  realm.isActive
                    ? 'text-slate-200 bg-void-800/40'
                    : 'text-slate-500 hover:text-slate-300 hover:bg-void-800/40'
                }`}
              >
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0 transition-all"
                  style={{
                    backgroundColor: realm.isActive ? realm.color : 'transparent',
                    border: `1px solid ${realm.color}`,
                    boxShadow: realm.isActive ? `0 0 4px ${realm.color}` : 'none',
                  }}
                />
                <span style={{ color: realm.isActive ? realm.color : undefined }} className="flex-shrink-0">
                  {realm.symbol}
                </span>
                <span className="truncate flex-1 text-left">{realm.name}</span>
                {realmCounts[realm.id] > 0 && (
                  <span
                    className="text-[9px] font-mono tabular-nums flex-shrink-0"
                    style={{ color: realm.isActive ? realm.color : '#475569' }}
                  >
                    {realmCounts[realm.id]}
                  </span>
                )}
              </button>
            ))}
            <div className="border-t border-void-700/40">
              {showNewRealmInput ? (
                <div className="flex items-center gap-1 px-2 py-1.5">
                  <input
                    ref={newRealmInputRef}
                    type="text"
                    value={newRealmInput}
                    onChange={(e) => setNewRealmInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddRealm();
                      if (e.key === 'Escape') { setShowNewRealmInput(false); setNewRealmInput(''); }
                      e.stopPropagation();
                    }}
                    placeholder="Realm name…"
                    className="flex-1 bg-void-800/60 border border-void-700/60 rounded px-2 py-1 text-[11px] font-mono text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-cosmic-cyan/50 min-w-0"
                  />
                  <button
                    onClick={handleAddRealm}
                    className="text-cosmic-cyan hover:text-cosmic-cyan/80 text-xs font-mono px-1 flex-shrink-0"
                  >
                    ✓
                  </button>
                  <button
                    onClick={() => { setShowNewRealmInput(false); setNewRealmInput(''); }}
                    className="text-slate-600 hover:text-slate-300 text-xs font-mono px-1 flex-shrink-0"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowNewRealmInput(true)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-mono text-slate-500 hover:text-slate-300 hover:bg-void-800/40 transition-colors"
                >
                  + Add new realm
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Sanctum ── */}
      <div className="relative flex-shrink-0">
        <DropdownButton
          label="Sanctum"
          isOpen={openDropdown === 'sanctum'}
          onClick={() => toggleDropdown('sanctum')}
        />
        {openDropdown === 'sanctum' && (
          <div className="absolute top-full left-0 mt-1 w-56 bg-void-900 border border-void-700/60 rounded-lg shadow-2xl overflow-hidden">
            {(Object.keys(TERRAIN_NAMES) as TerrainId[]).map((id) => (
              <button
                key={id}
                onClick={() => { setTerrain(id); setOpenDropdown(null); }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-mono transition-colors ${
                  activeTerrain === id
                    ? 'text-cosmic-cyan bg-void-800/60'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-void-800/40'
                }`}
              >
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{
                    backgroundColor: TERRAIN_COLORS[id],
                    boxShadow: activeTerrain === id ? `0 0 6px ${TERRAIN_COLORS[id]}` : 'none',
                  }}
                />
                <span>{TERRAIN_NAMES[id]}</span>
                {activeTerrain === id && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-cosmic-cyan animate-pulse flex-shrink-0" />
                )}
              </button>
            ))}
            <div className="border-t border-void-700/40">
              <button
                onClick={() => { setIsSanctumModalOpen(true); setOpenDropdown(null); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-mono text-slate-500 hover:text-slate-300 hover:bg-void-800/40 transition-colors"
              >
                Open full Sanctum…
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Export / Import ── */}
      <div className="relative flex-shrink-0">
        <DropdownButton
          label="Export / Import"
          isOpen={openDropdown === 'exportimport'}
          onClick={() => toggleDropdown('exportimport')}
        />
        {openDropdown === 'exportimport' && (
          <div className="absolute top-full left-0 mt-1 w-40 bg-void-900 border border-void-700/60 rounded-lg shadow-2xl overflow-hidden">
            <button
              onClick={handleExport}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-mono text-slate-400 hover:text-slate-200 hover:bg-void-800/60 transition-colors"
            >
              <Download size={11} />
              Export
            </button>
            <button
              onClick={handleImportClick}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-mono text-slate-400 hover:text-slate-200 hover:bg-void-800/60 transition-colors"
            >
              <Upload size={11} />
              Import
            </button>
          </div>
        )}
      </div>

      {/* ── Info (rightmost) ── */}
      <div className="ml-auto flex-shrink-0">
        <a
          href="/info"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded font-mono text-[11px] text-slate-500 hover:text-slate-300 hover:bg-void-800/60 transition-colors"
        >
          <Info size={12} />
          <span>INFO</span>
        </a>
      </div>

      {/* Hidden file input */}
      <input
        ref={importInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleImportFile}
      />

      {isSanctumModalOpen && <SanctumModal onClose={() => setIsSanctumModalOpen(false)} />}
    </nav>
  );
}
