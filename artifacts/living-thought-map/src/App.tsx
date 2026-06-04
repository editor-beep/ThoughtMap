import React, { useState, useEffect, useRef } from 'react';
import { ClerkProvider, SignIn, SignUp, useAuth } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import 'reactflow/dist/style.css';
import { Router as WouterRouter, Route, Switch, useLocation } from 'wouter';
import { Sparkles, Map } from 'lucide-react';
import TopNav from './components/TopNav';
import SpatialCanvas from './components/SpatialCanvas';
import ThoughtStreamRail from './components/ThoughtStreamRail';
import { useThoughtStore, MASTER_MAP_ID } from './store';
import InfoPage from './pages/InfoPage';
import PaywallModal from './components/PaywallModal';

// REQUIRED — copy verbatim per clerk-auth skill
const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

// REQUIRED — empty in dev, auto-set in prod
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

const rawBase = import.meta.env.BASE_URL || '/';
const basePath = rawBase.endsWith('/') && rawBase !== '/' ? rawBase.slice(0, -1) : (rawBase === '/' ? '' : rawBase);

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || '/'
    : path;
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: 'clerk',
  options: {
    logoPlacement: 'inside' as const,
    logoLinkUrl: basePath || '/',
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: '#06b6d4',
    colorForeground: '#e2e8f0',
    colorMutedForeground: '#94a3b8',
    colorDanger: '#f43f5e',
    colorBackground: '#0b0f19',
    colorInput: '#111827',
    colorInputForeground: '#e2e8f0',
    colorNeutral: '#1e293b',
    fontFamily: "'Inter', sans-serif",
    borderRadius: '0.5rem',
  },
  elements: {
    rootBox: 'w-full flex justify-center',
    cardBox: 'rounded-2xl w-[440px] max-w-full overflow-hidden border border-[#1e293b]',
    card: '!shadow-none !border-0 !bg-transparent !rounded-none',
    footer: '!shadow-none !border-0 !bg-transparent !rounded-none',
    headerTitle: 'text-slate-100',
    headerSubtitle: 'text-slate-400',
    socialButtonsBlockButtonText: 'text-slate-200',
    formFieldLabel: 'text-slate-300',
    footerActionLink: 'text-[#06b6d4]',
    footerActionText: 'text-slate-400',
    dividerText: 'text-slate-500',
    identityPreviewEditButton: 'text-[#06b6d4]',
    formFieldSuccessText: 'text-[#10b981]',
    alertText: 'text-slate-200',
    logoBox: 'mb-2',
    logoImage: 'h-10 w-10',
    socialButtonsBlockButton: 'border-[#1e293b]',
    formButtonPrimary: 'font-semibold',
    formFieldInput: '',
    footerAction: '',
    dividerLine: '',
    alert: '',
    otpCodeFieldInput: '',
    formFieldRow: '',
    main: '',
  },
};

function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-void-900 px-4">
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-void-900 px-4">
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
    </div>
  );
}

function UserSyncEffect() {
  const { isSignedIn, isLoaded } = useAuth();
  const syncedRef = useRef(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      syncedRef.current = false;
      return;
    }
    if (syncedRef.current) return;
    syncedRef.current = true;
    fetch('/api/user/sync', { method: 'POST', credentials: 'include' }).catch(() => {});
  }, [isSignedIn, isLoaded]);

  return null;
}

function MapUrlSync() {
  const { currentMapId, switchMap, maps } = useThoughtStore();
  const [location, navigate] = useLocation();

  useEffect(() => {
    const target = currentMapId === MASTER_MAP_ID ? '/' : `/map/${currentMapId}`;
    if (location !== target) navigate(target, { replace: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMapId]);

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
  const paywallOpen = useThoughtStore((s) => s.paywallOpen);
  const setPaywallOpen = useThoughtStore((s) => s.setPaywallOpen);

  return (
    <>
      <MapUrlSync />
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
      <PaywallModal open={paywallOpen} onClose={() => setPaywallOpen(false)} />
    </>
  );
}

function AppRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: { start: { title: 'Welcome back', subtitle: 'Sign in to ThoughtMap' } },
        signUp: { start: { title: 'Begin mapping', subtitle: 'Create your account for AI features' } },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <UserSyncEffect />
      <Switch>
        {/* REQUIRED — /*? is the only wouter syntax that matches OAuth sub-paths */}
        <Route path="/sign-in/*?" component={SignInPage} />
        <Route path="/sign-up/*?" component={SignUpPage} />
        <Route path="/info" component={InfoPage} />
        <Route path="*" component={CanvasApp} />
      </Switch>
    </ClerkProvider>
  );
}

export default function App() {
  return (
    <WouterRouter base={basePath}>
      <AppRoutes />
    </WouterRouter>
  );
}
