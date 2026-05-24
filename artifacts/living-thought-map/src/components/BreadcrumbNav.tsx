import React from 'react';

interface Crumb { label: string; onClick?: () => void }

export default function BreadcrumbNav({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav className="flex items-center gap-2 text-xs font-mono text-slate-400">
      {crumbs.map((crumb, idx) => (
        <React.Fragment key={`${crumb.label}-${idx}`}>
          <button className="hover:text-cyan-300" onClick={crumb.onClick} disabled={!crumb.onClick}>{crumb.label}</button>
          {idx < crumbs.length - 1 && <span className="text-slate-600">&gt;</span>}
        </React.Fragment>
      ))}
    </nav>
  );
}
