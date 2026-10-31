import { type CSSProperties, type FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ColorScheme } from '../../shared/settings';
import type { LoginState, MediaKeysState } from '../../shared/ipc';
import { MAX_CUSTOM_THEMES, type Palette, type Theme, ownTheme, themeSlug } from '../../shared/themes';
import { openDialog, useAppStore } from '../state/app';
import { setFollowing } from '../state/notify';
import { setPrefs, usePrefs } from '../state/prefs';
import { refreshLiveNow, useYouTube } from '../state/youtube';
import { THEMES, useTheme } from '../theme/engine';
import { Dialog } from './Dialog';
import { IconClose } from './icons';
import { SportIcon } from './sport-icons';

const CONSOLE_URL = 'https://console.cloud.google.com/apis/library/youtube.googleapis.com';

export function SettingsDialog() {
  const { t } = useTranslation();
  const audioFocus = usePrefs((s) => s.audioFocus);
  const clipboard = usePrefs((s) => s.clipboardSuggestions);
  const version = useAppStore((s) => s.info?.version);
  // Every setting applies at once, except an API key, which is saved only once YouTube accepts it:
  // closing with a key typed but not saved asks first.
  const keyForm = useKeyForm();
  const [askKey, setAskKey] = useState(false);

  const requestClose = () => {
    if (askKey) setAskKey(false);
    else if (keyForm.key.trim() && !keyForm.busy) setAskKey(true);
    else openDialog(null);
  };

  const saveAndClose = async () => {
    setAskKey(false);
    if (await keyForm.save()) openDialog(null);
    else keyForm.focus();
  };

  const footer = askKey && (
    <>
      <p role="alert">{t('settings.keyUnsaved')}</p>
      {/* Enter saves: the focus starts on this button. */}
      <button type="button" className="button" autoFocus onClick={() => void saveAndClose()}>
        {t('settings.keySave')}
      </button>
      <button type="button" className="button button-quiet" onClick={() => openDialog(null)}>
        {t('settings.keyDiscard')}
      </button>
    </>
  );

  return (
    <Dialog title={t('settings.title')} onClose={requestClose} footer={footer} wide>
      <p className="note settings-saved">{t('settings.savedNote')}</p>
      <AppearanceSection />
      <section className="settings-section">
        <h3>{t('settings.sound')}</h3>
        <fieldset className="field">
          <legend>{t('settings.audioFocus')}</legend>
          <label>
            <input
              type="radio"
              name="audio-focus"
              checked={audioFocus === 'click'}
              onChange={() => setPrefs({ audioFocus: 'click' })}
            />
            {t('settings.audioFocusClick')}
          </label>
          <label>
            <input
              type="radio"
              name="audio-focus"
              checked={audioFocus === 'hover'}
              onChange={() => setPrefs({ audioFocus: 'hover' })}
            />
            {t('settings.audioFocusHover')}
          </label>
        </fieldset>
        <MediaKeysField />
        <label className="field">
          <input
            type="checkbox"
            checked={clipboard}
            onChange={(e) => setPrefs({ clipboardSuggestions: e.target.checked })}
          />
          {t('settings.clipboard')}
        </label>
      </section>

      <StartupSection />
      <ApiKeySection form={keyForm} />
      <NotifySection />
      <QuotaSection />
      <SportsSection />

      {version && <p className="dialog-meta">{t('settings.version', { version })}</p>}
      <div className="dialog-actions">
        <button type="button" className="button" onClick={requestClose}>
          {t('settings.close')}
        </button>
      </div>
    </Dialog>
  );
}

const SCHEMES: ColorScheme[] = ['system', 'light', 'dark'];
const AUTO_THEME = 'auto';
const SCHEME_LABELS = { system: 'settings.schemeSystem', light: 'settings.schemeLight', dark: 'settings.schemeDark' };

function AppearanceSection() {
  const { t } = useTranslation();
  const choice = usePrefs((s) => s.theme);
  const colorScheme = usePrefs((s) => s.colorScheme);
  const animate = usePrefs((s) => s.animate);
  const performance = usePrefs((s) => s.performance);
  const spoilers = usePrefs((s) => s.spoilers);
  const scheme = useTheme((s) => s.scheme);
  const active = useTheme((s) => s.theme);
  const own = usePrefs((s) => s.customThemes);

  const option = (value: string, name: string, note: string, palette: Palette, sport: string | null) => (
    <label key={value} className="theme-option">
      <input type="radio" name="theme" checked={choice === value} onChange={() => setPrefs({ theme: value })} />
      <span
        className="theme-swatch"
        aria-hidden="true"
        style={
          {
            '--swatch-base': palette.scene.base,
            '--swatch-line': palette.scene.line,
            '--swatch-accent': palette.ui.accent,
          } as CSSProperties
        }
      >
        <SportIcon sport={sport} />
      </span>
      <span className="theme-name">{name}</span>
      <span className="theme-note">{note}</span>
    </label>
  );

  return (
    <section className="settings-section">
      <h3>{t('settings.appearance')}</h3>
      <fieldset className="field">
        <legend>{t('settings.theme')}</legend>
        <div className="theme-grid">
          {option(
            AUTO_THEME,
            t('settings.themeAuto'),
            t('settings.themeAutoNote'),
            active[scheme],
            active.sports[0] ?? null,
          )}
          {THEMES.filter((theme) => !theme.event).map((theme) =>
            option(
              theme.id,
              t(`themes.${theme.id}`, theme.id),
              theme.sports.length
                ? theme.sports.map((s) => t(`sports.${s}`, s)).join(', ')
                : t('settings.themeNeutralNote'),
              theme[scheme],
              theme.sports[0] ?? null,
            ),
          )}
          {own.map((theme) =>
            option(theme.id, theme.name ?? theme.id, t('settings.themeOwnNote'), theme[scheme], null),
          )}
        </div>
        <ThemeTools />
      </fieldset>
      <fieldset className="field">
        <legend>{t('settings.scheme')}</legend>
        {SCHEMES.map((value) => (
          <label key={value}>
            <input
              type="radio"
              name="color-scheme"
              checked={colorScheme === value}
              onChange={() => setPrefs({ colorScheme: value })}
            />
            {t(SCHEME_LABELS[value])}
          </label>
        ))}
      </fieldset>
      <label className="field field-tight">
        <input
          type="checkbox"
          checked={animate && !performance}
          disabled={performance}
          onChange={(e) => setPrefs({ animate: e.target.checked })}
        />
        {t('settings.animate')}
      </label>
      <p className="note field-note">{t('settings.animateNote')}</p>
      <label className="field field-tight">
        <input type="checkbox" checked={performance} onChange={(e) => setPrefs({ performance: e.target.checked })} />
        {t('settings.performance')}
      </label>
      <p className="note field-note">{t('settings.performanceNote')}</p>
      <label className="field field-tight">
        <input type="checkbox" checked={spoilers} onChange={(e) => setPrefs({ spoilers: e.target.checked })} />
        {t('settings.spoilers')}
      </label>
      <p className="note field-note">{t('settings.spoilersNote')}</p>
    </section>
  );
}

type KeyForm = ReturnType<typeof useKeyForm>;

function useKeyForm() {
  const { t } = useTranslation();
  const [key, setKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  // true once YouTube accepted the key and it is stored.
  const save = async (): Promise<boolean> => {
    if (!key.trim()) {
      setProblem(t('settings.keyFailed.no-key'));
      return false;
    }
    setBusy(true);
    setProblem(null);
    try {
      const result = await window.splitwatch.setApiKey(key);
      if (result.ok) setKey('');
      else setProblem(t(`settings.keyFailed.${result.reason}`));
      return result.ok;
    } finally {
      setBusy(false);
    }
  };

  return { key, setKey, busy, problem, save, input, focus: () => input.current?.focus() };
}

function MediaKeysField() {
  const { t } = useTranslation();
  const on = usePrefs((s) => s.mediaKeys);
  const [state, setState] = useState<MediaKeysState | null>(null);

  useEffect(() => {
    // The main process takes the keys right after the setting is saved.
    const timer = setTimeout(() => void window.splitwatch.getMediaKeysState().then(setState), 300);
    return () => clearTimeout(timer);
  }, [on]);

  return (
    <>
      <label className="field field-tight">
        <input type="checkbox" checked={on} onChange={(e) => setPrefs({ mediaKeys: e.target.checked })} />
        {t('settings.mediaKeys')}
      </label>
      <p className="note field-note">{t('settings.mediaKeysNote')}</p>
      {on && state?.needsAccessibility && <p className="note field-note">{t('settings.mediaKeysAccessibility')}</p>}
      {on && state && !state.held && !state.needsAccessibility && (
        <p className="note field-note">{t('settings.mediaKeysTaken')}</p>
      )}
    </>
  );
}

function StartupSection() {
  const { t } = useTranslation();
  const platform = useAppStore((s) => s.info?.platform) ?? '';
  const background = usePrefs((s) => s.background);
  const startHidden = usePrefs((s) => s.startHidden);
  const [login, setLogin] = useState<LoginState | null>(null);

  useEffect(() => {
    void window.splitwatch.getLoginState().then(setLogin);
  }, []);

  return (
    <section className="settings-section">
      <h3>{t('settings.startup')}</h3>
      <label className="field field-tight">
        <input
          type="checkbox"
          checked={background}
          onChange={(e) =>
            setPrefs(e.target.checked ? { background: true } : { background: false, startHidden: false })
          }
        />
        {t('settings.background', { platform })}
      </label>
      <p className="note field-note">{t('settings.backgroundNote')}</p>
      <label className="field field-tight">
        <input
          type="checkbox"
          checked={login?.openAtLogin ?? false}
          disabled={!login?.supported}
          onChange={(e) => void window.splitwatch.setOpenAtLogin(e.target.checked).then(setLogin)}
        />
        {t('settings.startAtLogin')}
      </label>
      {login && !login.supported && <p className="note field-note">{t('settings.startUnavailable')}</p>}
      {login?.status === 'requires-approval' && <p className="note field-note">{t('settings.startApproval')}</p>}
      <label className="field">
        <input
          type="checkbox"
          checked={startHidden}
          disabled={!background || !login?.openAtLogin}
          onChange={(e) => setPrefs({ startHidden: e.target.checked })}
        />
        {t('settings.startHidden', { platform })}
      </label>
    </section>
  );
}

function NotifySection() {
  const { t } = useTranslation();
  const platform = useAppStore((s) => s.info?.platform) ?? '';
  const notify = usePrefs((s) => s.notify);
  const hasKey = useYouTube((s) => s.status?.key === 'valid');
  const presets = useYouTube((s) => s.presets);
  const [failed, setFailed] = useState(false);
  const sports = useMemo(
    () =>
      [...new Set(presets.map((p) => p.sport))].sort((a, b) => t(`sports.${a}`, a).localeCompare(t(`sports.${b}`, b))),
    [presets, t],
  );

  const turn = (on: boolean) => {
    setPrefs({ notify: { ...notify, on } });
    setFailed(false);
    if (on) void window.splitwatch.testNotification().then((shown) => setFailed(!shown));
  };

  return (
    <section className="settings-section">
      <h3>{t('settings.notify')}</h3>
      <label className="field field-tight">
        <input
          type="checkbox"
          checked={notify.on && hasKey}
          disabled={!hasKey}
          onChange={(e) => turn(e.target.checked)}
        />
        {t('settings.notifyOn')}
      </label>
      <p className="note field-note">
        {hasKey ? t('settings.notifyNote', { platform }) : t('settings.notifyNeedsKey')}
      </p>
      {failed && (
        <p className="dialog-problem" role="alert">
          {t('settings.notifyFailed')}
        </p>
      )}
      {notify.on && hasKey && (
        <>
          <fieldset className="field">
            <legend>{t('settings.notifySports')}</legend>
            <div className="sport-grid">
              {sports.map((sport) => (
                <label key={sport}>
                  <input
                    type="checkbox"
                    checked={notify.sports.includes(sport)}
                    onChange={(e) =>
                      setPrefs({
                        notify: {
                          ...notify,
                          sports: e.target.checked
                            ? [...notify.sports, sport]
                            : notify.sports.filter((s) => s !== sport),
                        },
                      })
                    }
                  />
                  {t(`sports.${sport}`, sport)}
                </label>
              ))}
            </div>
          </fieldset>
          <h4 className="settings-subhead">{t('settings.notifyChannels')}</h4>
          {notify.channels.length === 0 ? (
            <p className="note">{t('settings.notifyNoChannels')}</p>
          ) : (
            <ul className="followed">
              {notify.channels.map((c) => (
                <li key={c.id}>
                  <span dir="auto">{c.name}</span>
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={t('settings.notifyUnfollow', { channel: c.name })}
                    title={t('settings.notifyUnfollow', { channel: c.name })}
                    onClick={() => setFollowing(c, false)}
                  >
                    <IconClose />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}

function ApiKeySection({ form }: { form: KeyForm }) {
  const { t } = useTranslation();
  const status = useYouTube((s) => s.status);
  const { key, setKey, busy, problem, input } = form;
  const state = status?.key ?? 'none';

  const save = (e: FormEvent) => {
    e.preventDefault();
    void form.save();
  };

  return (
    <section className="settings-section">
      <h3>{t('settings.youtube')}</h3>
      <p className="note">{t('settings.keyIntro')}</p>
      <p className={`key-state key-${state}`} role="status">
        {t(`settings.keyState.${state}`)}
      </p>
      {state !== 'unavailable' && (
        <form className="key-form" onSubmit={save}>
          <input
            ref={input}
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            aria-label={t('settings.keyLabel')}
            placeholder={t('settings.keyLabel')}
            autoComplete="off"
            spellCheck={false}
            dir="ltr"
          />
          <button type="submit" className="button" disabled={busy}>
            {busy ? t('settings.keyChecking') : t('settings.keySave')}
          </button>
          {(state === 'valid' || state === 'invalid') && (
            <button type="button" className="button button-quiet" onClick={() => void window.splitwatch.removeApiKey()}>
              {t('settings.keyRemove')}
            </button>
          )}
        </form>
      )}
      {problem && (
        <p className="dialog-problem" role="alert">
          {problem}
        </p>
      )}
      <details className="guide">
        <summary>{t('settings.guideTitle')}</summary>
        <ol>
          <li>{t('settings.guide1')}</li>
          <li>{t('settings.guide2')}</li>
          <li>{t('settings.guide3')}</li>
          <li>{t('settings.guide4')}</li>
          <li>{t('settings.guide5')}</li>
        </ol>
        <a className="button button-quiet" href={CONSOLE_URL} target="_blank" rel="noreferrer">
          {t('settings.openConsole')}
        </a>
      </details>
    </section>
  );
}

function QuotaSection() {
  const { t } = useTranslation();
  const status = useYouTube((s) => s.status);
  if (!status || status.key === 'none' || status.key === 'unavailable') return null;
  const searchesUsed = status.exhausted.includes('searches') ? status.limits.searches : status.used.searches;
  const unitsUsed = status.exhausted.includes('units') ? status.limits.units : status.used.units;

  return (
    <section className="settings-section">
      <h3>{t('settings.quota')}</h3>
      <div className="meter-row">
        <span>{t('settings.quotaSearches', { used: searchesUsed, limit: status.limits.searches })}</span>
        <meter min={0} max={status.limits.searches} value={searchesUsed} high={status.limits.searches * 0.8} />
      </div>
      <div className="meter-row">
        <span>{t('settings.quotaUnits', { used: unitsUsed, limit: status.limits.units })}</span>
        <meter min={0} max={status.limits.units} value={unitsUsed} high={status.limits.units * 0.8} />
      </div>
      <p className="note">{t('settings.quotaResets', { time: new Date(status.resetsAt) })}</p>
    </section>
  );
}

function SportsSection() {
  const { t } = useTranslation();
  const presets = useYouTube((s) => s.presets);
  const chosen = usePrefs((s) => s.sports);
  const sports = useMemo(
    () =>
      [...new Set(presets.map((p) => p.sport))].sort((a, b) => t(`sports.${a}`, a).localeCompare(t(`sports.${b}`, b))),
    [presets, t],
  );
  if (!sports.length) return null;

  const toggle = (sport: string, on: boolean) => {
    setPrefs({ sports: on ? [...chosen, sport] : chosen.filter((s) => s !== sport) });
    setTimeout(() => void refreshLiveNow(), 100);
  };

  return (
    <section className="settings-section">
      <h3>{t('settings.sports')}</h3>
      <p className="note">{t('settings.sportsNote')}</p>
      <div className="sport-grid">
        {sports.map((sport) => (
          <label key={sport}>
            <input type="checkbox" checked={chosen.includes(sport)} onChange={(e) => toggle(sport, e.target.checked)} />
            {t(`sports.${sport}`, sport)}
          </label>
        ))}
      </div>
    </section>
  );
}

// Making, changing, sharing and deleting themes of the user's own.
function ThemeTools() {
  const { t } = useTranslation();
  const choice = usePrefs((s) => s.theme);
  const own = usePrefs((s) => s.customThemes);
  const active = useTheme((s) => s.theme);
  const [message, setMessage] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const mine = own.find((x) => x.id === choice) ?? null;
  const full = own.length >= MAX_CUSTOM_THEMES;
  const nameOf = (theme: Theme) => theme.name ?? t(`themes.${theme.id}`, theme.id);

  const edit = (theme: Theme, isNew: boolean) =>
    useAppStore.setState({ themeDraft: { theme, isNew }, dialog: 'themeEditor' });

  const importTheme = async () => {
    setMessage(null);
    const result = await window.splitwatch.importTheme();
    if (!result) return;
    if ('error' in result) {
      setMessage(t(result.error === 'contrast' ? 'settings.themeContrast' : 'settings.themeInvalid'));
      return;
    }
    const current = usePrefs.getState().customThemes;
    const name = result.theme.name ?? result.theme.id;
    // A file with an app theme's ID becomes a theme of its own.
    const builtIn = THEMES.some((x) => x.id === result.theme.id);
    const replacing = !builtIn && current.some((x) => x.id === result.theme.id);
    if (!replacing && current.length >= MAX_CUSTOM_THEMES) {
      setMessage(t('settings.themeFull', { max: MAX_CUSTOM_THEMES }));
      return;
    }
    const id = builtIn ? themeSlug(name, new Set([...THEMES, ...current].map((x) => x.id))) : result.theme.id;
    const theme = ownTheme(result.theme, id, name);
    setPrefs({ customThemes: [...current.filter((x) => x.id !== id), theme], theme: id });
    setMessage(t(replacing ? 'settings.themeUpdated' : 'settings.themeAdded', { name }));
  };

  const exportTheme = async () => {
    setMessage(null);
    const theme = mine ?? ownTheme(active, active.id, nameOf(active));
    if (await window.splitwatch.exportTheme(theme)) setMessage(t('settings.themeExported'));
  };

  const remove = () => {
    if (!mine) return;
    setPrefs({ customThemes: own.filter((x) => x.id !== mine.id), theme: 'auto' });
    setConfirming(false);
    setMessage(t('settings.themeDeleted', { name: nameOf(mine) }));
  };

  return (
    <div className="theme-tools">
      <div className="theme-tools-row">
        <button
          type="button"
          className="button button-quiet"
          disabled={full}
          onClick={() => edit(ownTheme(active, '', t('themeEditor.defaultName')), true)}
        >
          {t('settings.themeNew')}
        </button>
        {mine && (
          <button type="button" className="button button-quiet" onClick={() => edit(mine, false)}>
            {t('settings.themeEdit')}
          </button>
        )}
        <button type="button" className="button button-quiet" onClick={() => void importTheme()}>
          {t('settings.themeImport')}
        </button>
        <button type="button" className="button button-quiet" onClick={() => void exportTheme()}>
          {t('settings.themeExport')}
        </button>
        {mine && !confirming && (
          <button type="button" className="button button-quiet" onClick={() => setConfirming(true)}>
            {t('settings.themeDelete')}
          </button>
        )}
      </div>
      {confirming && mine && (
        <div className="theme-tools-row" role="alert">
          <span>{t('settings.themeDeleteAsk', { name: nameOf(mine) })}</span>
          <button type="button" className="button" onClick={remove}>
            {t('settings.themeDelete')}
          </button>
          <button type="button" className="button button-quiet" onClick={() => setConfirming(false)}>
            {t('settings.themeKeep')}
          </button>
        </div>
      )}
      {message && (
        <p className="note" role="status">
          {message}
        </p>
      )}
    </div>
  );
}
