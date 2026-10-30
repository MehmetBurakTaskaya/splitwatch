import { defineConfig } from 'vite';
import { external } from './vite.main.config.ts';

// Preload: sandboxed preloads must be CommonJS.
export default defineConfig({
  build: {
    ssr: 'src/preload/index.ts',
    outDir: 'dist/preload',
    emptyOutDir: true,
    target: 'node22',
    sourcemap: true,
    rollupOptions: {
      external,
      output: { format: 'cjs', entryFileNames: 'index.cjs' },
    },
  },
});
