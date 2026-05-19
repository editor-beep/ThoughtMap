import { defineConfig } from 'vite';
import react from '@vitejs/react-refresh';
import path from 'path';

export default defineConfig({
  root: __dirname,
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@core': path.resolve(__dirname, '../../packages/core/src'),
      '@ui': path.resolve(__dirname, '../../packages/ui/src'),
      '@types': path.resolve(__dirname, '../../packages/types/src')
    }
  },
  server: {
    port: 3000
  }
});
