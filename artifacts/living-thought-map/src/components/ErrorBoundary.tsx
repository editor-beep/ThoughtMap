import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Catches render-time exceptions anywhere in the tree so a single bad render
 * shows a recoverable message instead of white-screening the whole app. It also
 * normalizes non-Error throws (which otherwise surface as the opaque
 * "uncaught exception ... was not an error object") into a real Error with a
 * logged stack, making future crashes diagnosable.
 */
export default class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    const normalized = error instanceof Error ? error : new Error(String(error));
    return { error: normalized };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    const normalized = error instanceof Error ? error : new Error(String(error));
    console.error('[ErrorBoundary] Caught render error:', normalized, info.componentStack);
  }

  handleReset = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return (
        <div className="w-full h-full min-h-screen flex flex-col items-center justify-center gap-4 bg-[#0b0f19] p-6 text-center">
          <p className="font-mono text-xs uppercase tracking-widest text-rose-400">Something broke</p>
          <p className="max-w-md font-mono text-[11px] leading-relaxed text-slate-400">
            {this.state.error.message}
          </p>
          <button
            onClick={this.handleReset}
            className="rounded border border-void-700 bg-void-800/90 px-4 py-2 font-mono text-xs text-slate-200 transition-colors hover:bg-void-700"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
