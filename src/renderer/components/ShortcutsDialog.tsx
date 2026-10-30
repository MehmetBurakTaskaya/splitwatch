import { type KeyboardEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  SHORTCUT_ACTIONS,
  type ShortcutAction,
  actionFor,
  isReservedKey,
  keyName,
  resolveShortcuts,
} from '../../shared/shortcuts';
import { openDialog, useAppStore } from '../state/app';
import { setPrefs, usePrefs } from '../state/prefs';
import { Dialog } from './Dialog';

const ARROWS: Record<string, string> = { ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓' };

// "Alt+ArrowLeft" → "Alt + ←"; "Shift+?" → "?" (the shift is implied by the character).
export function useKeyLabel(): (name: string) => string {
  const { t } = useTranslation();
  return (name) =>
    name
      .replace(/^Shift\+(.)$/, '$1')
      .split('+')
      .map((part) => (part === 'Space' ? t('shortcuts.keys.space') : (ARROWS[part] ?? part)))
      .join(' + ');
}

export function ShortcutsDialog() {
  const { t } = useTranslation();
  const label = useKeyLabel();
  const overrides = usePrefs((s) => s.shortcuts);
  const shortcuts = resolveShortcuts(overrides);
  const [editing, setEditing] = useState<ShortcutAction | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const mod = useAppStore((s) => s.info?.platform) === 'darwin' ? '⌘' : 'Ctrl';

  const capture = (e: KeyboardEvent, action: ShortcutAction) => {
    if (e.key === 'Escape' || e.key === 'Tab') return;
    e.preventDefault();
    e.stopPropagation();
    const name = keyName(e);
    if (!name) return;
    if (isReservedKey(name)) return setProblem(t('shortcuts.reserved', { key: label(name) }));
    const owner = actionFor(name, shortcuts);
    if (owner && owner !== action) {
      return setProblem(t('shortcuts.taken', { key: label(name), action: t(`shortcuts.actions.${owner}`) }));
    }
    setPrefs({ shortcuts: { ...overrides, [action]: name } });
    setEditing(null);
    setProblem(null);
  };

  return (
    <Dialog title={t('shortcuts.title')} onClose={() => openDialog(null)}>
      <table className="shortcuts">
        <tbody>
          <tr>
            <td>{t('shortcuts.digits')}</td>
            <td>
              <kbd>1</kbd>–<kbd>9</kbd>
            </td>
            <td />
          </tr>
          <tr>
            <td>{t('shortcuts.escape')}</td>
            <td>
              <kbd>{t('shortcuts.keys.escape')}</kbd>
            </td>
            <td />
          </tr>
          <tr>
            <td>{t('shortcuts.search')}</td>
            <td>
              <kbd>{`${mod} + K`}</kbd>
            </td>
            <td />
          </tr>
          <tr>
            <td>{t('shortcuts.layouts')}</td>
            <td>
              <kbd>{`${mod} + S`}</kbd>
            </td>
            <td />
          </tr>
          {SHORTCUT_ACTIONS.map((action) => (
            <tr key={action}>
              <td>{t(`shortcuts.actions.${action}`)}</td>
              <td>
                <kbd>{label(shortcuts[action])}</kbd>
              </td>
              <td>
                {editing === action ? (
                  <button
                    type="button"
                    className="button button-quiet"
                    autoFocus
                    onKeyDown={(e) => capture(e, action)}
                    onBlur={() => setEditing(null)}
                  >
                    {t('shortcuts.press')}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="button button-quiet"
                    onClick={() => {
                      setEditing(action);
                      setProblem(null);
                    }}
                  >
                    {t('shortcuts.change')}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {problem && (
        <p className="dialog-problem" role="alert">
          {problem}
        </p>
      )}
      <div className="dialog-actions">
        <button type="button" className="button button-quiet" onClick={() => setPrefs({ shortcuts: {} })}>
          {t('shortcuts.reset')}
        </button>
        <button type="button" className="button" onClick={() => openDialog(null)}>
          {t('shortcuts.close')}
        </button>
      </div>
    </Dialog>
  );
}
