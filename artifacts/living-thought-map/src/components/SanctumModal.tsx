import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { useThoughtStore } from '../store';
import type { TerrainId } from '../types';
import TerrainCanvas from './TerrainCanvas';

interface TerrainDef {
  id: TerrainId;
  name: string;
  description: string;
}

const TERRAINS: TerrainDef[] = [
  {
    id: 'memory-palace',
    name: 'Memory Palace',
    description: 'Warm candlelight and parquet floors. A space of deep recall.',
  },
  {
    id: 'interstellar-plane',
    name: 'Interstellar Plane',
    description: 'Infinite starfield threaded with nebulae. Ideas without gravity.',
  },
  {
    id: 'terrestrial-globe',
    name: 'Terrestrial Globe',
    description: 'Antique parchment, cartographic lines, and the weight of place.',
  },
  {
    id: 'mythic-landscape',
    name: 'Mythic Landscape',
    description: 'Floating particles and glowing flora. The border of waking.',
  },
  {
    id: 'the-void',
    name: 'The Void',
    description: 'Near-perfect darkness. Maximum focus on what you have built.',
  },
];

interface SanctumModalProps {
  onClose: () => void;
}

export default function SanctumModal({ onClose }: SanctumModalProps) {
  const { activeTerrain, setTerrain } = useThoughtStore();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleSelect = (id: TerrainId) => {
    setTerrain(id);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-void-900/80 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="relative bg-void-800 border border-void-700/60 rounded-xl p-8 w-full max-w-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="font-mono text-sm tracking-widest uppercase text-slate-300">The Sanctum</h2>
            <p className="font-mono text-[10px] text-slate-500 mt-1 tracking-wider">
              Choose the skin of your mind.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-600 hover:text-slate-300 transition-colors p-1 rounded hover:bg-void-700"
          >
            <X size={14} />
          </button>
        </div>

        <div className="border-t border-void-700/40 my-5" />

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {TERRAINS.map((terrain) => {
            const isActive = activeTerrain === terrain.id;
            return (
              <button
                key={terrain.id}
                onClick={() => handleSelect(terrain.id)}
                className={`group text-left rounded-lg overflow-hidden border transition-all duration-200 ${
                  isActive
                    ? 'border-cosmic-cyan/60 ring-1 ring-cosmic-cyan/30'
                    : 'border-void-700/50 hover:border-slate-600/80'
                }`}
              >
                <div className="h-24 w-full relative overflow-hidden">
                  <TerrainCanvas terrain={terrain.id} preview />
                  {isActive && (
                    <div className="absolute top-1.5 right-1.5 z-10 w-1.5 h-1.5 rounded-full bg-cosmic-cyan animate-pulse" />
                  )}
                </div>
                <div className="p-2.5 bg-void-800/80">
                  <div className={`font-mono text-[11px] tracking-wide mb-0.5 transition-colors ${
                    isActive ? 'text-cosmic-cyan' : 'text-slate-300 group-hover:text-slate-100'
                  }`}>
                    {terrain.name}
                  </div>
                  <div className="font-sans text-[10px] text-slate-500 leading-relaxed">
                    {terrain.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-6 text-center font-mono text-[9px] text-slate-600 tracking-widest uppercase">
          Transition fades slowly. Selection persists.
        </div>
      </div>
    </div>
  );
}
