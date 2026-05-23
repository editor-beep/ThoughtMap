import React from 'react';
import { Compass } from 'lucide-react';

export default function InfoPage() {
  return (
    <div className="flex flex-col items-center justify-center w-screen h-dvh bg-void-900 text-slate-300 font-mono">
      <Compass size={32} className="text-cosmic-cyan mb-6 opacity-60" />
      <h1 className="text-sm tracking-widest uppercase text-slate-300 mb-2">ThoughtMap</h1>
      <p className="text-xs text-slate-600 tracking-wider mb-8">V0.1.0 // Spatial Dominance</p>
      <p className="text-xs text-slate-500 mb-6">Info page — coming soon.</p>
      <a
        href="/"
        className="text-[11px] tracking-widest uppercase text-slate-600 hover:text-cosmic-cyan transition-colors"
      >
        ← Back to canvas
      </a>
    </div>
  );
}
