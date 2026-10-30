import { builtinModules } from 'node:module';
import { defineConfig } from 'vite';

// Main process: one CommonJS file; Electron, electron-updater (the one runtime dependency) and Node
// built-ins stay external, and every other package (i18next for the tray and notifications) is
// bundled in, since the packaged app ships no other node_modules.
export const external = ['electron', 'electron-updater', ...builtinModules, ...builtinModules.map((m) => `node:${m}`)];

export default defineConfig({
  ssr: { noExternal: true },
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
