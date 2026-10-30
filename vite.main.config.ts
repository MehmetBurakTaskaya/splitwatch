import { builtinModules } from 'node:module';
import { defineConfig } from 'vite';

// Main process: one CommonJS file; Electron, electron-updater and Node built-ins stay external.
export const external = ['electron', 'electron-updater', ...builtinModules, ...builtinModules.map((m) => `node:${m}`)];

export default defineConfig({
  build: {
    ssr: 'src/main/index.ts',
    outDir: 'dist/main',
    emptyOutDir: true,
    target: 'node22',
    sourcemap: true,
    rollupOptions: {
      external,
      output: { format: 'cjs', entryFileNames: 'index.cjs' },
    },
  },
});
