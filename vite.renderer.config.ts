import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// The renderer: relative asset paths, served by the app:// protocol in production.
export default defineConfig({
  root: 'src/renderer',
  base: './',
  plugins: [react()],
  build: {
    outDir: '../../dist/renderer',
    emptyOutDir: true,
    target: 'chrome140',
  },
});
