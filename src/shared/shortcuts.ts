// Keyboard shortcuts. Keys 1-9 always select a stream; every other action can be reassigned.

export const SHORTCUT_ACTIONS = [
  'toggleMute',
  'enlarge',
  'playPause',
  'seekBack',
  'seekForward',
  'nextLayout',
  'moveEarlier',
  'moveLater',
  'miniPlayer',
  'help',
] as const;

export type ShortcutAction = (typeof SHORTCUT_ACTIONS)[number];

export const DEFAULT_SHORTCUTS: Readonly<Record<ShortcutAction, string>> = {
  toggleMute: 'M',
  enlarge: 'F',
  playPause: 'Space',
  seekBack: 'ArrowLeft',
  seekForward: 'ArrowRight',
  nextLayout: 'L',
  moveEarlier: 'Alt+ArrowLeft',
  moveLater: 'Alt+ArrowRight',
  miniPlayer: 'I',
  help: 'Shift+?',
};

export interface KeyLike {
  key: string;
  code?: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
}

const MODIFIER_KEYS = new Set(['Shift', 'Control', 'Alt', 'Meta', 'AltGraph', 'CapsLock', 'Dead']);

// Turns a keyboard event into a stable name such as "M", "Space", "Alt+ArrowLeft" or "Shift+?",
// or null for a lone modifier key.
export function keyName(e: KeyLike): string | null {
  if (MODIFIER_KEYS.has(e.key)) return null;
  let key = e.key === ' ' ? 'Space' : e.key.length === 1 ? e.key.toUpperCase() : e.key;
  // With Alt, or on a non-Latin keyboard layout (Cyrillic, Arabic, Turkish ş), a letter key
  // produces another character; the physical key keeps the shortcut working.
  const latin = /^[\x20-\x7E]$/.test(key) || key.length > 1;
  if ((e.altKey || !latin) && e.code?.startsWith('Key')) key = e.code.slice(3);
  const mods = [e.ctrlKey && 'Ctrl', e.metaKey && 'Meta', e.altKey && 'Alt', e.shiftKey && 'Shift'].filter(Boolean);
  return [...mods, key].join('+');
}

export function resolveShortcuts(overrides: Partial<Record<ShortcutAction, string>>): Record<ShortcutAction, string> {
  return { ...DEFAULT_SHORTCUTS, ...overrides };
}

// Which action a key triggers, if any.
export function actionFor(name: string, shortcuts: Record<ShortcutAction, string>): ShortcutAction | null {
  return SHORTCUT_ACTIONS.find((a) => shortcuts[a] === name) ?? null;
}

// Keys a user cannot assign: digits select streams, Escape leaves fullscreen and closes dialogs,
// Tab and Enter move and act on the focus.
export function isReservedKey(name: string): boolean {
  return /^[1-9]$/.test(name) || ['Escape', 'Tab', 'Enter', 'Shift+Tab'].includes(name);
}
