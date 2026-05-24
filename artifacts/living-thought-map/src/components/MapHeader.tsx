import React from 'react';
import BreadcrumbNav from './BreadcrumbNav';

export default function MapHeader({
  crumbs,
  title,
  onExit,
  isDetail,
}: {
  crumbs: { label: string; onClick?: () => void }[];
  title: string;
  onExit: () => void;
  isDetail: boolean;
}) {
  return (
    <div className="absolute top-3 left-3 z-30 rounded-lg border border-void-700 bg-void-900/80 p-3">
      <BreadcrumbNav crumbs={crumbs} />
      <div className="mt-2 flex items-center gap-3">
        <h2 className="text-sm text-slate-200">{title}</h2>
        {isDetail && <button className="text-xs text-cyan-300" onClick={onExit}>Exit to Parent</button>}
      </div>
    </div>
  );
}
