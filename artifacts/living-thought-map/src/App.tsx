import React, { useState } from 'react';
import 'reactflow/dist/style.css';
import { Sparkles, Maximize2, Minimize2, Layers, Map } from 'lucide-react';
import ContextHistoryRail from './components/ContextHistoryRail';
import SpatialCanvas from './components/SpatialCanvas';
import ThoughtStreamRail from './components/ThoughtStreamRail';

export default function App() {
  const [streamOpen, setStreamOpen] = useState(false);
  const [realmOpen, setRealmOpen] = useState(false);
  const [immersive, setImmersive] = useState(false);

  const openRealm  = () => { setRealmOpen(true);  setStreamOpen(false); };
  const openStream = () => { setStreamOpen(true);  setRealmOpen(false); };
  const openCanvas = () => { setRealmOpen(false);  setStreamOpen(false); };

  return (
    <div className="flex w-screen h-dvh bg-void-900 text-slate-300 font-sans antialiased overflow-hidden">
      <div className={`transition-all duration-300 flex-shrink-0 ${immersive ? 'w-0 overflow-hidden' : ''}`}>
        <ContextHistoryRail isOpen={realmOpen} onClose={() => setRealmOpen(false)} />
      </div>
      <main className="flex-1 h-full relative border-x border-void-700/50 min-w-0 pb-14 md:pb-0">
        <SpatialCanvas />
        <button
          onClick={() => setImmersive(!immersive)}
          title={immersive ? 'Exit immersive mode' : 'Enter immersive mode'}
          className="hidden md:flex absolute top-3 right-3 z-30 w-7 h-7 items-center justify-center rounded text-slate-600 hover:text-slate-300 hover:bg-void-800/60 transition-colors"
        >
          {immersive ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
        </button>
      </main>
      <div className={`transition-all duration-300 flex-shrink-0 ${immersive ? 'w-0 overflow-hidden' : ''}`}>
        <ThoughtStreamRail isOpen={streamOpen} onClose={() => setStreamOpen(false)} />
      </div>

      {/* Mobile bottom navigation bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-14 bg-void-900/95 border-t border-void-800/60 backdrop-blur-sm flex items-center z-50">
        <button
          onClick={openRealm}
          className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 transition-colors ${realmOpen ? 'text-cosmic-cyan' : 'text-slate-500 hover:text-slate-300'}`}
        >
          <Layers size={18} />
          <span className="font-mono text-[9px] uppercase tracking-wider">Realms</span>
        </button>
        <button
          onClick={openCanvas}
          className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 transition-colors ${!realmOpen && !streamOpen ? 'text-cosmic-cyan' : 'text-slate-500 hover:text-slate-300'}`}
        >
          <Map size={18} />
          <span className="font-mono text-[9px] uppercase tracking-wider">Canvas</span>
        </button>
        <button
          onClick={openStream}
          className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 transition-colors ${streamOpen ? 'text-cosmic-cyan' : 'text-slate-500 hover:text-slate-300'}`}
        >
          <Sparkles size={18} />
          <span className="font-mono text-[9px] uppercase tracking-wider">Stream</span>
        </button>
      </nav>
    </div>
  );
}
