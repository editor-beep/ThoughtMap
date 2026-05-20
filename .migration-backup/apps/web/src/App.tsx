import React from 'react';
import ContextHistoryRail from './components/ContextHistoryRail';
import SpatialCanvas from './components/SpatialCanvas';
import ThoughtStreamRail from './components/ThoughtStreamRail';

export default function App() {
  return (
    <div className="flex w-screen h-screen bg-void-900 text-slate-300 font-sans antialiased overflow-hidden">
      <ContextHistoryRail />
      <main className="flex-1 h-full relative border-x border-void-700/50">
        <SpatialCanvas />
      </main>
      <ThoughtStreamRail />
    </div>
  );
}
