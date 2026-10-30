import type { SplitwatchApi } from '../shared/ipc';

declare global {
  interface Window {
    splitwatch: SplitwatchApi;
  }
}

export {};
