import React, { useState } from 'react';
import 'reactflow/dist/style.css';
import { Sparkles, Maximize2, Minimize2 } from 'lucide-react';
import ContextHistoryRail from './components/ContextHistoryRail';
import SpatialCanvas from './components/SpatialCanvas';
import ThoughtStreamRail from './components/ThoughtStreamRail';

export default function App() {
  const [streamOpen, setStreamOpen] = useState(false);
  const [immersive, setImmersive] = useState(false);

  return (
    <div className="flex w-screen h-screen bg-void-900 text-slate-300 font-sans antialiased overflow-hidden">
      <div className={`transition-all duration-300 flex-shrink-0 ${immersive ? 'w-0 overflow-hidden' : ''}`}>
        <ContextHistoryRail />
      </div>
      <main className="flex-1 h-full relative border-x border-void-700/50 min-w-0">
        <SpatialCanvas />
        <button
          onClick={() => setImmersive(!immersive)}
          title={immersive ? 'Exit immersive mode' : 'Enter immersive mode'}
          className="hidden md:flex absolute top-3 right-3 z-30 w-7 h-7 items-center justify-center rounded text-slate-600 hover:text-slate-300 hover:bg-void-800/60 transition-colors"
        >
          {immersive ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
        </button>
        <button
          onClick={() => setStreamOpen(true)}
          className="md:hidden absolute bottom-6 right-6 w-12 h-12 rounded-full bg-cosmic-cyan text-void-900 flex items-center justify-center shadow-lg z-40"
        >
          <Sparkles size={20} />
        </button>
      </main>
      <div className={`transition-all duration-300 flex-shrink-0 ${immersive ? 'w-0 overflow-hidden' : ''}`}>
        <ThoughtStreamRail isOpen={streamOpen} onClose={() => setStreamOpen(false)} />
      </div>
    </div>
  );
}
