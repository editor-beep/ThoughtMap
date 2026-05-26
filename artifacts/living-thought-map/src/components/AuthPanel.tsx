import React, { useEffect, useRef, useState } from 'react';
import { LogOut, Zap, AlertTriangle } from 'lucide-react';
import { useThoughtStore } from '../store';
import { pullSync, pushSync } from '../lib/sync';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

async function signInWithToken(idToken: string): Promise<void> {
  const res = await fetch('/api/auth/google', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });

  if (!res.ok) throw new Error('Sign-in failed');
  const { token, user } = await res.json() as { token: string; user: { id: string; email: string; name: string | null } };

  // Fetch subscription status
  const meRes = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } });
  const { subscription } = meRes.ok ? await meRes.json() as { subscription: { status: string } } : { subscription: { status: 'none' } };

  useThoughtStore.getState().setAuth(token, user, subscription.status);

  // Try to pull remote snapshot after sign-in
  try {
    const { hasRemote, newerThanLocal, data } = await pullSync();
    if (hasRemote && newerThanLocal && data) {
      // Store the pending sync data for the UI to offer the user
      sessionStorage.setItem('pendingSyncData', JSON.stringify(data));
      window.dispatchEvent(new CustomEvent('thoughtmap:syncavailable'));
    }
  } catch {
    // Sync pull failed silently — not critical
  }
}

export default function AuthPanel() {
  const { user, subscriptionStatus, authToken, clearAuth } = useThoughtStore();
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [syncAvailable, setSyncAvailable] = useState(false);
  const buttonRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Initialize Google Sign-In button
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || user || !buttonRef.current) return;

    const tryInit = () => {
      if (!window.google?.accounts) return;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (response) => {
          setLoading(true);
          try {
            await signInWithToken(response.credential);
          } catch {
            // Sign-in failed silently
          } finally {
            setLoading(false);
          }
        },
        cancel_on_tap_outside: false,
      });
      if (buttonRef.current) {
        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: 'filled_black',
          size: 'medium',
          type: 'standard',
          shape: 'rectangular',
          text: 'signin_with',
          logo_alignment: 'left',
        });
      }
    };

    // GSI script may not be loaded yet
    const interval = setInterval(() => {
      if (window.google?.accounts) { clearInterval(interval); tryInit(); }
    }, 100);
    const timeout = setTimeout(() => clearInterval(interval), 5000);
    return () => { clearInterval(interval); clearTimeout(timeout); };
  }, [user]);

  // Listen for sync-available events
  useEffect(() => {
    const handler = () => setSyncAvailable(true);
    window.addEventListener('thoughtmap:syncavailable', handler);
    return () => window.removeEventListener('thoughtmap:syncavailable', handler);
  }, []);

  // Close panel on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleLoadFromCloud = async () => {
    const raw = sessionStorage.getItem('pendingSyncData');
    if (!raw) return;
    try {
      const data = JSON.parse(raw) as Record<string, unknown>;
      useThoughtStore.getState().importMap(data);
      sessionStorage.removeItem('pendingSyncData');
      setSyncAvailable(false);
      setOpen(false);
    } catch {
      // Malformed sync data
    }
  };

  const handleSignOut = () => {
    window.google?.accounts.id.disableAutoSelect();
    clearAuth();
    setOpen(false);
  };

  const handleSubscribe = async () => {
    if (!authToken) return;
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const { url } = await res.json() as { url: string };
        window.location.href = url;
      }
    } catch { /* ignore */ }
  };

  const handleManageBilling = async () => {
    if (!authToken) return;
    try {
      const res = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const { url } = await res.json() as { url: string };
        window.location.href = url;
      }
    } catch { /* ignore */ }
  };

  const handleSyncNow = async () => {
    if (!authToken) return;
    try {
      await pushSync();
    } catch { /* ignore */ }
    setOpen(false);
  };

  if (!user) {
    // Not signed in — show Google Sign-In button
    if (!GOOGLE_CLIENT_ID) return null;
    return (
      <div className="flex items-center flex-shrink-0">
        {loading ? (
          <span className="text-[11px] font-mono text-slate-500 px-2">Signing in…</span>
        ) : (
          <div ref={buttonRef} className="scale-75 origin-right" />
        )}
      </div>
    );
  }

  const isActive = subscriptionStatus === 'active';

  return (
    <div ref={panelRef} className="relative flex-shrink-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2 py-1 rounded font-mono text-[11px] text-slate-400 hover:text-slate-200 hover:bg-void-800/60 transition-colors"
        title={user.email}
      >
        {syncAvailable && <AlertTriangle size={10} className="text-amber-400" />}
        <span
          className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isActive ? 'bg-emerald-400' : 'bg-slate-600'}`}
        />
        <span className="max-w-[120px] truncate">{user.name ?? user.email.split('@')[0]}</span>
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-1 w-56 bg-void-900 border border-void-700/60 rounded-lg shadow-2xl overflow-hidden z-50">
          <div className="px-3 py-2.5 border-b border-void-700/40">
            <div className="text-[11px] font-mono text-slate-300 truncate">{user.email}</div>
            <div className={`text-[10px] font-mono mt-0.5 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`}>
              {isActive ? 'Subscribed' : subscriptionStatus === 'past_due' ? 'Payment past due' : 'Free account'}
            </div>
          </div>

          {syncAvailable && (
            <button
              onClick={handleLoadFromCloud}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-mono text-amber-400 hover:bg-void-800/60 transition-colors"
            >
              <AlertTriangle size={11} />
              Load cloud version
            </button>
          )}

          {isActive && (
            <button
              onClick={handleSyncNow}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-mono text-slate-400 hover:text-slate-200 hover:bg-void-800/60 transition-colors"
            >
              <Zap size={11} />
              Sync now
            </button>
          )}

          {!isActive && (
            <button
              onClick={handleSubscribe}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-mono text-cosmic-cyan hover:bg-void-800/60 transition-colors"
            >
              <Zap size={11} />
              Subscribe to use AI
            </button>
          )}

          {isActive && (
            <button
              onClick={handleManageBilling}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-mono text-slate-400 hover:text-slate-200 hover:bg-void-800/60 transition-colors"
            >
              Manage billing
            </button>
          )}

          <div className="border-t border-void-700/40">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-mono text-slate-500 hover:text-slate-300 hover:bg-void-800/40 transition-colors"
            >
              <LogOut size={11} />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
