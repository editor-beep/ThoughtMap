import React from 'react';
import { useThoughtStore } from '../store';
import { Compass, X, Wind } from 'lucide-react';

export default function CartographerPanel() {
  const {
    cartographerPanelOpen,
    cartographerLoading,
    cartographerWanderResponse,
    closeCartographerPanel,
    requestWanderMode,
    clearWanderResponse,
    nodes,
    activeTerrain,
  } = useThoughtStore();

  if (!cartographerPanelOpen) return null;

  const terrainNames: Record<string, string> = {
    'memory-palace': 'Memory Palace',
    'interstellar-plane': 'Interstellar Plane',
    'terrestrial-globe': 'Terrestrial Globe',
    'mythic-landscape': 'Mythic Landscape',
    'the-void': 'The Void',
  };

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-void-900/70 backdrop-blur-sm"
      onClick={closeCartographerPanel}
    >
      <div
        className="bg-void-800 border border-void-700 rounded-xl w-full max-w-md mx-4 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-void-700/60 bg-void-900/40">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-cosmic-cyan/10 border border-cosmic-cyan/30 flex items-center justify-center">
              <Compass size={16} className="text-cosmic-cyan" />
            </div>
            <div>
              <h2 className="font-mono text-sm text-slate-200">The Cartographer</h2>
              <p className="font-mono text-[10px] text-slate-500">
                Guardian of the {terrainNames[activeTerrain] || 'Terrain'}
              </p>
            </div>
          </div>
          <button
            onClick={closeCartographerPanel}
            className="text-slate-500 hover:text-slate-300 transition-colors p-1"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex items-center gap-4 text-[11px] font-mono text-slate-500">
            <span>{nodes.length} nodes anchored</span>
            <span className="text-void-700">|</span>
            <span className="capitalize">{activeTerrain.replace(/-/g, ' ')}</span>
          </div>

          {cartographerWanderResponse && (
            <div className="bg-void-900/60 border border-void-700/40 rounded-lg p-4">
              <p className="text-[12px] text-slate-300 leading-relaxed italic">
                {cartographerWanderResponse}
              </p>
              {!cartographerLoading && (
                <button
                  onClick={clearWanderResponse}
                  className="mt-3 text-[10px] font-mono text-slate-600 hover:text-slate-400 transition-colors"
                >
                  Dismiss
                </button>
              )}
            </div>
          )}

          {cartographerLoading && !cartographerWanderResponse && (
            <div className="flex flex-col items-center justify-center py-8 space-y-3">
              <div className="w-8 h-8 rounded-full border-2 border-cosmic-cyan/30 border-t-cosmic-cyan animate-spin" />
              <p className="text-[11px] font-mono text-slate-500">Surveying the terrain...</p>
            </div>
          )}

          {!cartographerLoading && !cartographerWanderResponse && (
            <div className="space-y-3">
              <p className="text-[11px] text-slate-500 leading-relaxed">
                The Cartographer observes your map from within, noticing patterns, tensions, and unexplored territories.
              </p>
              <button
                onClick={requestWanderMode}
                disabled={nodes.length === 0}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-cosmic-cyan/10 border border-cosmic-cyan/30 text-cosmic-cyan text-xs font-mono hover:bg-cosmic-cyan/20 hover:border-cosmic-cyan/50 transition-all disabled:opacity-40 disabled:cursor-not-allowed group"
              >
                <Wind size={14} className="group-hover:animate-pulse" />
                <span>Invoke Wander Mode</span>
              </button>
              {nodes.length === 0 && (
                <p className="text-[10px] text-slate-600 text-center">
                  The map is empty. Extract some thoughts first.
                </p>
              )}
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-void-700/40 bg-void-900/20">
          <p className="text-[9px] font-mono text-slate-600 text-center">
            The Cartographer speaks in the language of your terrain
          </p>
        </div>
      </div>
    </div>
  );
}
