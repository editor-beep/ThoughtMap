import React, { useState } from 'react';
import 'reactflow/dist/style.css';
import { Sparkles, Map } from 'lucide-react';
import TopNav from './components/TopNav';
import SpatialCanvas from './components/SpatialCanvas';
import ThoughtStreamRail from './components/ThoughtStreamRail';

export default function App() {
  const [streamOpen, setStreamOpen] = useState(false);
  const [immersive, setImmersive] = useState(false);

  return (
    <div className="flex flex-col w-screen h-dvh bg-void-900 text-slate-300 font-sans antialiased overflow-hidden">
      {/* Top navigation bar */}
      {!immersive && <TopNav />}

      {/* Canvas + right rail row */}
      <div className="flex flex-1 min-h-0">
        <main className="flex-1 h-full relative min-w-0 pb-14 md:pb-0">
          <SpatialCanvas immersive={immersive} onImmersiveToggle={() => setImmersive(!immersive)} />
        </main>
        <div className={`transition-all duration-300 flex-shrink-0 ${immersive ? 'w-0 overflow-hidden' : ''}`}>
          <ThoughtStreamRail isOpen={streamOpen} onClose={() => setStreamOpen(false)} />
        </div>
      </div>

      {/* Mobile bottom navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-14 bg-void-900/95 border-t border-void-800/60 backdrop-blur-sm flex items-center z-50">
        <button
          onClick={() => setStreamOpen(false)}
          className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 transition-colors ${!streamOpen ? 'text-cosmic-cyan' : 'text-slate-500 hover:text-slate-300'}`}
        >
          <Map size={18} />
          <span className="font-mono text-[9px] uppercase tracking-wider">Canvas</span>
        </button>
        <button
          onClick={() => setStreamOpen(true)}
          className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 transition-colors ${streamOpen ? 'text-cosmic-cyan' : 'text-slate-500 hover:text-slate-300'}`}
        >
          <Sparkles size={18} />
          <span className="font-mono text-[9px] uppercase tracking-wider">Stream</span>
        </button>
      </nav>
    </div>
  );
}
