import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { DEBUG, IS_DEV } from './config/debug';

if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    if (!IS_DEV || !DEBUG.performance) return;
    console.error('[Runtime Error]', {
      message: event.message,
      source: event.filename,
      line: event.lineno,
      column: event.colno,
    });
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
