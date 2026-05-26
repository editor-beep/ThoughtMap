import React from 'react';
import { Zap, X } from 'lucide-react';
import { useThoughtStore } from '../store';

export default function UpgradeModal() {
  const { subscriptionError, clearSubscriptionError, authToken, user } = useThoughtStore();

  if (!subscriptionError) return null;

  const isUsageLimit = subscriptionError === 'usage_limit_reached';

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

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-void-900 border border-void-700/60 rounded-xl shadow-2xl w-full max-w-sm">
        <div className="flex items-start justify-between p-5 pb-0">
          <div className="flex items-center gap-2">
            <Zap size={16} className="text-cosmic-cyan" />
            <h2 className="font-mono text-sm text-slate-200">
              {isUsageLimit ? 'Monthly limit reached' : 'Subscription required'}
            </h2>
          </div>
          <button
            onClick={clearSubscriptionError}
            className="text-slate-600 hover:text-slate-300 transition-colors p-0.5"
          >
            <X size={14} />
          </button>
        </div>

        <p className="px-5 py-3 text-xs font-mono text-slate-400 leading-relaxed">
          {isUsageLimit
            ? 'You\'ve used all your AI requests for this billing period. They reset automatically on your next renewal.'
            : 'AI features — chat, cartographer, and node extraction — require an active subscription. The canvas and local storage remain free.'}
        </p>

        <div className="px-5 pb-5 flex flex-col gap-2">
          {!user ? (
            <p className="text-xs font-mono text-slate-500">Sign in with Google to subscribe.</p>
          ) : isUsageLimit ? (
            <button
              onClick={handleManageBilling}
              className="w-full px-4 py-2 rounded bg-cosmic-cyan/10 border border-cosmic-cyan/30 text-cosmic-cyan font-mono text-xs hover:bg-cosmic-cyan/20 transition-colors"
            >
              Manage billing
            </button>
          ) : (
            <button
              onClick={handleSubscribe}
              className="w-full px-4 py-2 rounded bg-cosmic-cyan/10 border border-cosmic-cyan/30 text-cosmic-cyan font-mono text-xs hover:bg-cosmic-cyan/20 transition-colors"
            >
              Subscribe — unlock AI
            </button>
          )}
          <button
            onClick={clearSubscriptionError}
            className="w-full px-4 py-2 rounded text-slate-500 font-mono text-xs hover:text-slate-300 transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
