import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { X, Sparkles, Brain, Map, Zap } from 'lucide-react';
import { useAuth } from '@clerk/react';

interface PaywallModalProps {
  open: boolean;
  onClose: () => void;
}

export default function PaywallModal({ open, onClose }: PaywallModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isSignedIn } = useAuth();
  const [, navigate] = useLocation();

  if (!open) return null;

  const handleSubscribe = async () => {
    if (!isSignedIn) {
      onClose();
      navigate('/sign-in');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/subscription/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Error ${res.status}`);
      }
      const { url } = await res.json();
      if (url) window.location.href = url;
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-void-900/80 backdrop-blur-sm px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-md bg-void-800 border border-void-700 rounded-2xl p-8 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 transition-colors"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-cosmic-cyan/10 flex items-center justify-center">
            <Sparkles size={20} className="text-cosmic-cyan" />
          </div>
          <div>
            <h2 className="text-slate-100 font-semibold text-lg leading-tight">Unlock AI Features</h2>
            <p className="text-slate-400 text-sm">Subscribe to access Navigator & Cartographer</p>
          </div>
        </div>

        <div className="space-y-3 mb-6">
          <div className="flex items-start gap-3">
            <Brain size={16} className="text-cosmic-purple mt-0.5 shrink-0" />
            <div>
              <p className="text-slate-200 text-sm font-medium">Navigator (AI Chat)</p>
              <p className="text-slate-400 text-xs">Think out loud with an AI partner that tracks your ideas across the canvas</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Map size={16} className="text-cosmic-amber mt-0.5 shrink-0" />
            <div>
              <p className="text-slate-200 text-sm font-medium">Cartographer</p>
              <p className="text-slate-400 text-xs">AI-powered idea crystallization, extraction, and map analysis</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Zap size={16} className="text-cosmic-cyan mt-0.5 shrink-0" />
            <div>
              <p className="text-slate-200 text-sm font-medium">Canvas always free</p>
              <p className="text-slate-400 text-xs">Nodes, edges, realms, and maps — no subscription required</p>
            </div>
          </div>
        </div>

        <div className="bg-void-700/50 rounded-xl p-4 mb-6 border border-void-700">
          <div className="flex items-baseline gap-2">
            <span className="text-slate-100 text-3xl font-bold">$10</span>
            <span className="text-slate-400 text-sm">/ month</span>
          </div>
          <p className="text-slate-400 text-xs mt-1">Cancel anytime from your account settings</p>
        </div>

        {error && (
          <p className="text-cosmic-rose text-sm mb-4">{error}</p>
        )}

        <button
          onClick={handleSubscribe}
          disabled={loading}
          className="w-full py-3 rounded-xl bg-cosmic-cyan text-void-900 font-semibold text-sm hover:bg-cosmic-cyan/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Loading…' : isSignedIn ? 'Subscribe for $10/month' : 'Sign in to subscribe'}
        </button>

        {!isSignedIn && (
          <p className="text-slate-500 text-xs text-center mt-3">
            Already have an account?{' '}
            <button
              onClick={() => { onClose(); navigate('/sign-in'); }}
              className="text-cosmic-cyan hover:underline"
            >
              Sign in
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
