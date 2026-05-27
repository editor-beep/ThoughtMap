import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useThoughtStore, MASTER_MAP_ID } from '../store';
import { Search, X, ChevronDown, Download, Upload, Info, Trash2, Plus, MoreHorizontal } from 'lucide-react';
type DropdownId = 'anchors' | 'realms' | 'exportimport' | 'mobile-more';

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
  const basePath = import.meta.env.BASE_URL || '/';
  const normalizedBasePath = basePath.endsWith('/') ? basePath.slice(0, -1) : basePath;
  const infoPath = `${normalizedBasePath}/info`;

  const {
    nodes, realms, maps,
    toggleRealm, addRealm, focusNode, deleteNode, addNode,
    importMap,
    importStatusMessage,
    setNodeSearchQuery,
    currentMapId,
    masterMapSearchQuery,
    setMasterMapSearchQuery,
    masterMapViewMode,
    setMasterMapViewMode,
    masterMapSortMode,
    setMasterMapSortMode,
  } = useThoughtStore();

  const [nodeSearch, setNodeSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<DropdownId | null>(null);
  const [newRealmInput, setNewRealmInput] = useState('');
  const [showNewRealmInput, setShowNewRealmInput] = useState(false);
  const [showNewAnchorInput, setShowNewAnchorInput] = useState(false);
  const [newAnchorTitle, setNewAnchorTitle] = useState('');
  const [newAnchorNote, setNewAnchorNote] = useState('');

  const isMasterMap = currentMapId === MASTER_MAP_ID;

  useEffect(() => {
    if (isMasterMap) setNodeSearchQuery('');
  }, [isMasterMap, setNodeSearchQuery]);

  const importInputRef = useRef<HTMLInputElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const newRealmInputRef = useRef<HTMLInputElement>(null);
  const newAnchorInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setNodeSearchQuery(nodeSearch.trim().toLowerCase());
  }, [nodeSearch, setNodeSearchQuery]);

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

  useEffect(() => {
    if (showNewRealmInput) newRealmInputRef.current?.focus();
  }, [showNewRealmInput]);

  useEffect(() => {
    if (showNewAnchorInput) newAnchorInputRef.current?.focus();
  }, [showNewAnchorInput]);

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
    if (id !== 'realms' && id !== 'mobile-more') {
      setShowNewRealmInput(false);
      setNewRealmInput('');
    }
    if (id !== 'anchors' && id !== 'mobile-more') {
      setShowNewAnchorInput(false);
      setNewAnchorTitle('');
      setNewAnchorNote('');
    }
  };

  const handleExport = () => {
    const data = { maps, currentMapId, realms };
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

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      importMap(data);
    } catch (error) {
      console.warn('[ThoughtMap] Failed to parse imported file', error);
      alert('Malformed JSON import');
    }
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

  const handleAddNode = () => {
    const id = addNode({
      title: 'New thought',
      content: '',
      type: 'thought',
      isAnchor: false,
      realms: [],
      x: Math.round((Math.random() - 0.5) * 400),
      y: Math.round((Math.random() - 0.5) * 300),
    });
    focusNode(id);
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

  // Shared panel content — rendered in desktop dropdown OR mobile-more sheet (never both simultaneously)
  const anchorsPanel = (
    <>
      {anchorNodes.length === 0 ? (
        <div className="px-3 py-3 text-xs font-mono text-slate-600 italic">No anchors yet.</div>
      ) : filteredAnchorNodes.length === 0 ? (
        <div className="px-3 py-3 text-xs font-mono text-slate-600 italic">No matches.</div>
      ) : (
        <div className="max-h-48 overflow-y-auto">
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
    </>
  );

  const realmsPanel = (
    <>
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
    </>
  );

  if (isMasterMap) {
    return (
      <nav ref={navRef} className="relative flex-shrink-0 h-11 bg-void-900/95 border-b border-void-800/60 flex items-center px-3 gap-2 z-40 backdrop-blur-sm">
        {/* Search — stays compact on mobile */}
        <div className="relative flex-shrink-0">
          <Search size={10} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" />
          <input
            type="text"
            value={masterMapSearchQuery}
            onChange={(e) => setMasterMapSearchQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            placeholder="Search maps…"
            className={`bg-void-800/60 border border-void-700/50 rounded pl-6 ${masterMapSearchQuery ? 'pr-6' : 'pr-2'} py-1 text-[11px] font-mono text-slate-400 placeholder:text-slate-600 focus:outline-none focus:border-cosmic-cyan/50 transition-all duration-200 ${searchFocused || masterMapSearchQuery ? 'md:w-64 w-[140px]' : 'w-[100px] md:w-[140px]'}`}
          />
          {masterMapSearchQuery && (
            <button
              onClick={() => setMasterMapSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-300 transition-colors"
            >
              <X size={10} />
            </button>
          )}
        </div>

        {/* Desktop-only: separator + sort + view selects */}
        <div className="hidden md:block w-px h-5 bg-void-700/50 flex-shrink-0" />
        <select
          value={masterMapSortMode}
          onChange={(e) => setMasterMapSortMode(e.target.value as 'recently-active' | 'recently-created' | 'alphabetical' | 'largest')}
          className="hidden md:inline-block bg-void-800/60 border border-void-700/50 rounded px-2.5 py-1 text-[11px] font-mono text-slate-400 focus:outline-none focus:border-cosmic-cyan/50"
        >
          <option value="recently-active">Recently Active</option>
          <option value="recently-created">Recently Created</option>
          <option value="largest">Largest</option>
          <option value="alphabetical">Alphabetical</option>
        </select>
        <select
          value={masterMapViewMode}
          onChange={(e) => setMasterMapViewMode(e.target.value as 'grid' | 'archive')}
          className="hidden md:inline-block bg-void-800/60 border border-void-700/50 rounded px-2.5 py-1 text-[11px] font-mono text-slate-400 focus:outline-none focus:border-cosmic-cyan/50"
        >
          <option value="grid">Grid</option>
          <option value="archive">Archive</option>
        </select>

        {/* Mobile-only: ⋯ overflow button */}
        <div className="md:hidden ml-auto relative flex-shrink-0">
          <button
            onClick={() => toggleDropdown('mobile-more')}
            className={`flex items-center px-2.5 py-1 rounded font-mono text-[11px] transition-colors ${openDropdown === 'mobile-more' ? 'text-slate-200 bg-void-800' : 'text-slate-400 hover:text-slate-200 hover:bg-void-800/60'}`}
          >
            <MoreHorizontal size={14} />
          </button>
          {openDropdown === 'mobile-more' && (
            <div className="absolute top-full right-0 mt-1 w-52 bg-void-900 border border-void-700/60 rounded-lg shadow-2xl overflow-hidden">
              <div className="px-3 pt-3 pb-2 space-y-2">
                <div className="font-mono text-[9px] uppercase tracking-widest text-slate-600">Sort</div>
                <select
                  value={masterMapSortMode}
                  onChange={(e) => { setMasterMapSortMode(e.target.value as 'recently-active' | 'recently-created' | 'alphabetical' | 'largest'); setOpenDropdown(null); }}
                  className="w-full bg-void-800/60 border border-void-700/50 rounded px-2.5 py-1.5 text-[11px] font-mono text-slate-400 focus:outline-none focus:border-cosmic-cyan/50"
                >
                  <option value="recently-active">Recently Active</option>
                  <option value="recently-created">Recently Created</option>
                  <option value="largest">Largest</option>
                  <option value="alphabetical">Alphabetical</option>
                </select>
                <div className="font-mono text-[9px] uppercase tracking-widest text-slate-600 pt-1">View</div>
                <select
                  value={masterMapViewMode}
                  onChange={(e) => { setMasterMapViewMode(e.target.value as 'grid' | 'archive'); setOpenDropdown(null); }}
                  className="w-full bg-void-800/60 border border-void-700/50 rounded px-2.5 py-1.5 text-[11px] font-mono text-slate-400 focus:outline-none focus:border-cosmic-cyan/50"
                >
                  <option value="grid">Grid</option>
                  <option value="archive">Archive</option>
                </select>
              </div>
              <div className="border-t border-void-700/40">
                <a
                  href={infoPath}
                  onClick={() => setOpenDropdown(null)}
                  className="flex items-center gap-2 px-3 py-2.5 text-xs font-mono text-slate-400 hover:text-slate-200 hover:bg-void-800/60 transition-colors"
                >
                  <Info size={11} />
                  Info
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Desktop-only: Info */}
        <div className="ml-auto hidden md:flex flex-shrink-0">
          <a href={infoPath} className="flex items-center gap-1.5 px-2.5 py-1 rounded font-mono text-[11px] text-slate-500 hover:text-slate-300 hover:bg-void-800/60 transition-colors">
            <Info size={12} />
            <span>INFO</span>
          </a>
        </div>
      </nav>
    );
  }

  return (
    <nav
      ref={navRef}
      className="relative flex-shrink-0 h-11 bg-void-900/95 border-b border-void-800/60 flex items-center px-3 gap-0.5 z-40 backdrop-blur-sm"
    >
      {/* ── Search — compact on mobile ── */}
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
          className={`bg-void-800/60 border border-void-700/50 rounded pl-6 ${nodeSearch ? 'pr-6' : 'pr-2'} py-1 text-[11px] font-mono text-slate-400 placeholder:text-slate-600 focus:outline-none focus:border-cosmic-cyan/50 transition-all duration-200 ${searchFocused || nodeSearch ? 'md:w-60 w-[120px]' : 'w-[90px] md:w-[120px]'}`}
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

      {/* ── New Node — icon-only on mobile ── */}
      <button
        onClick={handleAddNode}
        title="Add a new thought node"
        className="flex items-center gap-1 px-2.5 py-1 rounded font-mono text-[11px] text-cosmic-cyan/90 hover:text-cosmic-cyan hover:bg-void-800/60 transition-colors flex-shrink-0"
      >
        <Plus size={12} />
        <span className="hidden md:inline">New Node</span>
      </button>

      {/* ── Desktop-only: separator + Anchors + Realms + Export/Import ── */}
      <div className="hidden md:flex items-center gap-0.5 flex-shrink-0">
        <div className="w-px h-5 bg-void-700/50 mx-1.5 flex-shrink-0" />

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
              {anchorsPanel}
            </div>
          )}
        </div>

        <div className="relative flex-shrink-0">
          <DropdownButton
            label="Realms"
            isOpen={openDropdown === 'realms'}
            onClick={() => toggleDropdown('realms')}
          />
          {openDropdown === 'realms' && (
            <div className="absolute top-full left-0 mt-1 w-52 bg-void-900 border border-void-700/60 rounded-lg shadow-2xl overflow-hidden">
              {realmsPanel}
            </div>
          )}
        </div>

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
              {importStatusMessage && (
                <div className="mt-2 px-3 py-2 text-[10px] font-mono rounded border border-void-700/50 text-slate-400 bg-void-950/60">
                  {importStatusMessage}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Mobile-only: ⋯ overflow menu ── */}
      <div className="md:hidden ml-auto relative flex-shrink-0">
        <button
          onClick={() => toggleDropdown('mobile-more')}
          className={`flex items-center px-2.5 py-1 rounded font-mono text-[11px] transition-colors ${openDropdown === 'mobile-more' ? 'text-slate-200 bg-void-800' : 'text-slate-400 hover:text-slate-200 hover:bg-void-800/60'}`}
        >
          <MoreHorizontal size={14} />
        </button>
        {openDropdown === 'mobile-more' && (
          <div className="absolute top-full right-0 mt-1 w-64 bg-void-900 border border-void-700/60 rounded-lg shadow-2xl overflow-y-auto max-h-[calc(100dvh-3.5rem)]">
            {/* Anchors */}
            <div className="border-b border-void-700/40">
              <div className="px-3 py-2 flex items-center gap-2 font-mono text-[9px] uppercase tracking-widest text-slate-500">
                Anchors
                <span className="bg-void-800 border border-void-700/50 rounded px-1 py-px text-[9px] tabular-nums">{anchorNodes.length}</span>
              </div>
              {anchorsPanel}
            </div>

            {/* Realms */}
            <div className="border-b border-void-700/40">
              <div className="px-3 py-2 font-mono text-[9px] uppercase tracking-widest text-slate-500">Realms</div>
              {realmsPanel}
            </div>

            {/* Export / Import */}
            <div className="border-b border-void-700/40">
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
              {importStatusMessage && (
                <div className="mx-3 mb-2 px-3 py-2 text-[10px] font-mono rounded border border-void-700/50 text-slate-400 bg-void-950/60">
                  {importStatusMessage}
                </div>
              )}
            </div>

            {/* Info */}
            <a
              href={infoPath}
              onClick={() => setOpenDropdown(null)}
              className="flex items-center gap-2 px-3 py-2.5 text-xs font-mono text-slate-400 hover:text-slate-200 hover:bg-void-800/60 transition-colors"
            >
              <Info size={11} />
              Info
            </a>
          </div>
        )}
      </div>

      {/* ── Desktop-only: Info ── */}
      <div className="ml-auto hidden md:flex flex-shrink-0">
        <a
          href={infoPath}
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

    </nav>
  );
}
