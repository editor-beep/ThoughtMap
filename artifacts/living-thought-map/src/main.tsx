import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';
import { IS_DEV } from './config/debug';

const RESIZE_OBSERVER_ERRORS = new Set([
  'ResizeObserver loop completed with undelivered notifications.',
  'ResizeObserver loop limit exceeded',
]);

if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    if (RESIZE_OBSERVER_ERRORS.has(event.message)) {
      event.stopImmediatePropagation();
      event.preventDefault();
      return;
    }

    if (IS_DEV && event.error != null) {
      console.error('[Runtime Error]', {
        message: event.message,
        source: event.filename,
        line: event.lineno,
        column: event.colno,
        error: event.error,
      });
    }
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
