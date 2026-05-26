import React, { useState, useEffect } from 'react';
import 'reactflow/dist/style.css';
import { Router, Route, Switch, useLocation } from 'wouter';
import { Sparkles, Map } from 'lucide-react';
import TopNav from './components/TopNav';
import SpatialCanvas from './components/SpatialCanvas';
import ThoughtStreamRail from './components/ThoughtStreamRail';
import UpgradeModal from './components/UpgradeModal';
import { useThoughtStore, MASTER_MAP_ID } from './store';
import InfoPage from './pages/InfoPage';

function MapUrlSync() {
  const { currentMapId, switchMap, maps } = useThoughtStore();
  const [location, navigate] = useLocation();

  // Store → URL (keep URL in sync when map changes via UI)
  useEffect(() => {
    const target = currentMapId === MASTER_MAP_ID ? '/' : `/map/${currentMapId}`;
    if (location !== target) navigate(target, { replace: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMapId]);

  // URL → store on mount (deep-link support)
  useEffect(() => {
    const match = location.match(/^\/map\/(.+)$/);
    if (match && maps[match[1]]) switchMap(match[1]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

function CanvasApp() {
  const [streamOpen, setStreamOpen] = useState(false);
  const [immersive, setImmersive] = useState(false);
  const currentMapId = useThoughtStore((state) => state.currentMapId);
  const isMasterMapView = currentMapId === MASTER_MAP_ID;

  return (
    <>
      <MapUrlSync />
      <UpgradeModal />
      <div className="flex flex-col w-screen h-dvh bg-void-900 text-slate-300 font-sans antialiased overflow-hidden">
        {!immersive && <TopNav />}

        <div className="flex flex-1 min-h-0">
          <main className="flex-1 h-full relative min-w-0 pb-14 md:pb-0">
            <SpatialCanvas immersive={immersive} onImmersiveToggle={() => setImmersive(!immersive)} />
          </main>
          {!isMasterMapView && (
            <div className={`transition-all duration-300 flex-shrink-0 ${immersive ? 'w-0 overflow-hidden' : ''}`}>
              <ThoughtStreamRail isOpen={streamOpen} onClose={() => setStreamOpen(false)} />
            </div>
          )}
        </div>

        {!isMasterMapView && (
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
        )}
      </div>
    </>
  );
}

export default function App() {
  // Vite serves this artifact under a base path (e.g. `/living-thought-map/`).
  // Wouter needs to know that base so route patterns like `/info` match the
  // real URL `/living-thought-map/info`. Without this, every URL falls into
  // the catch-all and `/info` never renders.
  const rawBase = import.meta.env.BASE_URL || '/';
  const base = rawBase.endsWith('/') && rawBase !== '/' ? rawBase.slice(0, -1) : (rawBase === '/' ? '' : rawBase);

  return (
    <Router base={base}>
      <Switch>
        <Route path="/info" component={InfoPage} />
        {/* Wildcard catch-all — must use `*` (not `/:rest*`) so it also
            matches the root path `/` in wouter v3. */}
        <Route path="*" component={CanvasApp} />
      </Switch>
    </Router>
  );
}
