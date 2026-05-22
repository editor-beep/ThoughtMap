import React, { useState } from 'react';
import 'reactflow/dist/style.css';
import { Sparkles } from 'lucide-react';
import ContextHistoryRail from './components/ContextHistoryRail';
import SpatialCanvas from './components/SpatialCanvas';
import ThoughtStreamRail from './components/ThoughtStreamRail';

export default function App() {
  const [streamOpen, setStreamOpen] = useState(false);

  return (
    <div className="flex w-screen h-screen bg-void-900 text-slate-300 font-sans antialiased overflow-hidden">
      <ContextHistoryRail />
      <main className="flex-1 h-full relative border-x border-void-700/50">
        <SpatialCanvas />
        <button
          onClick={() => setStreamOpen(true)}
          className="md:hidden absolute bottom-6 right-6 w-12 h-12 rounded-full bg-cosmic-cyan text-void-900 flex items-center justify-center shadow-lg z-40"
        >
          <Sparkles size={20} />
        </button>
      </main>
      <ThoughtStreamRail isOpen={streamOpen} onClose={() => setStreamOpen(false)} />
    </div>
  );
}
