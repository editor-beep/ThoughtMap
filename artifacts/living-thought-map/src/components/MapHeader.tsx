import React, { useState, useRef, useEffect } from 'react';
import BreadcrumbNav from './BreadcrumbNav';

export default function MapHeader({
  crumbs,
  title,
  onExit,
  isDetail,
  onRename,
}: {
  crumbs: { label: string; onClick?: () => void }[];
  title: string;
  onExit: () => void;
  isDetail: boolean;
  onRename?: (title: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setValue(title); }, [title]);
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  const commit = () => {
    const trimmed = value.trim();
    if (trimmed && trimmed !== title) onRename?.(trimmed);
    else setValue(title);
    setEditing(false);
  };

  return (
    <div className="absolute top-3 left-3 z-30 rounded-lg border border-void-700 bg-void-900/80 p-3">
      <BreadcrumbNav crumbs={crumbs} />
      <div className="mt-2 flex items-center gap-3">
        {editing ? (
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit();
              if (e.key === 'Escape') { setValue(title); setEditing(false); }
            }}
            className="bg-transparent border-b border-cosmic-cyan/60 text-sm text-slate-200 outline-none w-40 pb-0.5"
          />
        ) : (
          <h2
            className={`text-sm text-slate-200 ${onRename ? 'cursor-pointer hover:text-cosmic-cyan transition-colors' : ''}`}
            onClick={() => onRename && setEditing(true)}
            title={onRename ? 'Click to rename' : undefined}
          >
            {title}
          </h2>
        )}
        {isDetail && <button className="text-xs text-cyan-300" onClick={onExit}>Exit to Parent</button>}
      </div>
    </div>
  );
}
