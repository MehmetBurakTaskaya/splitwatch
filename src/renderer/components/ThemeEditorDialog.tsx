import { type FormEvent, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BACKDROPS,
  type BackdropKind,
  DISPLAY_FONTS,
  type DisplayFont,
  MAX_THEME_NAME,
  SCENE_ROLES,
  type Scheme,
  type SceneRole,
  type Theme,
  UI_ROLES,
  type UiRole,
  contrastIssues,
  themeSlug,
} from '../../shared/themes';
import { openDialog, useAppStore } from '../state/app';
import { setPrefs, usePrefs } from '../state/prefs';
import { THEMES, previewTheme, useTheme } from '../theme/engine';
import { Dialog } from './Dialog';

const SCHEME_LABELS = { light: 'settings.schemeLight', dark: 'settings.schemeDark' } as const;
const SCHEMES: readonly Scheme[] = ['light', 'dark'];

// Makes or changes a theme of the user's own. While it is open, the whole app wears the theme being
// edited, in the mode whose colors are being edited. A theme whose text would be hard to read in
// either mode cannot be saved.
export function ThemeEditorDialog() {
  const { t } = useTranslation();
  const seed = useAppStore((s) => s.themeDraft);
  const [draft, setDraft] = useState<Theme | null>(seed?.theme ?? null);
  const [name, setName] = useState(seed?.theme.name ?? '');
  const [scheme, setScheme] = useState<Scheme>(() => useTheme.getState().scheme);
  const [asking, setAsking] = useState(false);

  useEffect(() => {
    if (draft) previewTheme(draft, scheme);
  }, [draft, scheme]);
  useEffect(() => () => previewTheme(null), []);

  if (!seed || !draft) return null;
  const issues = contrastIssues(draft);
  const trimmed = name.trim();
  const blocked = issues.length > 0 || !trimmed;

  const close = () => {
    useAppStore.setState({ themeDraft: null });
    openDialog('settings');
  };
  // Leaving with changes asks first, as Settings does.
  const changed = draft !== seed.theme || trimmed !== (seed.theme.name ?? '');
  const requestClose = () => {
    if (asking) setAsking(false);
    else if (changed) setAsking(true);
    else close();
  };

  const save = (e?: FormEvent) => {
    e?.preventDefault();
    if (blocked) return;
    const own = usePrefs.getState().customThemes;
    const taken = new Set([...THEMES, ...own].map((x) => x.id));
    const id = seed.isNew ? themeSlug(trimmed, taken) : draft.id;
    const theme: Theme = { ...draft, id, name: trimmed };
    setPrefs({ customThemes: [...own.filter((x) => x.id !== id), theme], theme: id });
    close();
  };

  const setColor = (group: 'ui' | 'scene', role: UiRole | SceneRole, value: string) =>
    setDraft({
      ...draft,
      [scheme]: { ...draft[scheme], [group]: { ...draft[scheme][group], [role]: value.toLowerCase() } },
    });

  const colorField = (group: 'ui' | 'scene', role: UiRole | SceneRole) => {
    const value = group === 'ui' ? draft[scheme].ui[role as UiRole] : draft[scheme].scene[role as SceneRole];
    const label = t(`themeEditor.${group}Roles.${role}`);
    return (
      <label key={role} className="color-field">
        <input type="color" value={value} aria-label={label} onChange={(e) => setColor(group, role, e.target.value)} />
        <span aria-hidden="true">{label}</span>
        <code dir="ltr">{value}</code>
      </label>
    );
  };

  const uiField = (role: UiRole) => colorField('ui', role);
  const sceneField = (role: SceneRole) => colorField('scene', role);

  const footer = asking ? (
    <>
      <p role="alert">{t(blocked ? 'themeEditor.askBlocked' : 'themeEditor.ask')}</p>
      {!blocked && (
        <button type="submit" form="theme-editor" className="button" autoFocus>
          {t('themeEditor.save')}
        </button>
      )}
      <button type="button" className="button button-quiet" autoFocus={blocked} onClick={close}>
        {t('themeEditor.discard')}
      </button>
    </>
  ) : (
    <>
      <button type="button" className="button button-quiet" onClick={close}>
        {t('themeEditor.cancel')}
      </button>
      <button type="submit" form="theme-editor" className="button" disabled={blocked}>
        {t('themeEditor.save')}
      </button>
    </>
  );

  return (
    <Dialog
      title={t(seed.isNew ? 'themeEditor.newTitle' : 'themeEditor.editTitle')}
      onClose={requestClose}
      onEnter={save}
      wide
      footer={footer}
    >
      <form id="theme-editor" className="theme-editor" onSubmit={save}>
        <p className="dialog-meta">{t('themeEditor.note')}</p>
        <label className="field field-text">
          <span>{t('themeEditor.name')}</span>
          <input
            type="text"
            value={name}
            maxLength={MAX_THEME_NAME}
            onChange={(e) => setName(e.target.value)}
            data-autofocus
            required
          />
        </label>
        <div className="theme-editor-row">
          <label className="field field-text">
            <span>{t('themeEditor.backdrop')}</span>
            <select
              value={draft.backdrop}
              onChange={(e) => setDraft({ ...draft, backdrop: e.target.value as BackdropKind })}
            >
              {BACKDROPS.map((b) => (
                <option key={b} value={b}>
                  {t(`backdrops.${b}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="field field-text">
            <span>{t('themeEditor.font')}</span>
            <select
              value={draft.font ?? ''}
              onChange={(e) => setDraft({ ...draft, font: (e.target.value || null) as DisplayFont | null })}
            >
              <option value="">{t('themeEditor.fontNone')}</option>
              {DISPLAY_FONTS.map((f) => (
                <option key={f} value={f}>
                  {t(`fonts.${f}`)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <fieldset className="field">
          <legend>{t('themeEditor.scheme')}</legend>
          {SCHEMES.map((value) => (
            <label key={value}>
              <input type="radio" name="editor-scheme" checked={scheme === value} onChange={() => setScheme(value)} />
              {t(SCHEME_LABELS[value])}
            </label>
          ))}
        </fieldset>
        <fieldset className="field">
          <legend>{t('themeEditor.ui')}</legend>
          <div className="color-grid">{UI_ROLES.map(uiField)}</div>
        </fieldset>
        <fieldset className="field">
          <legend>{t('themeEditor.scene')}</legend>
          <div className="color-grid">{SCENE_ROLES.map(sceneField)}</div>
        </fieldset>
        <section className="theme-check" aria-live="polite">
          <h3>{t('themeEditor.check')}</h3>
          {issues.length === 0 ? (
            <p>{t('themeEditor.ok')}</p>
          ) : (
            <ul>
              {issues.map((issue) => (
                <li key={`${issue.scheme}-${issue.fg}-${issue.bg}`}>
                  {t('themeEditor.issue', {
                    fg: t(`themeEditor.uiRoles.${issue.fg}`),
                    bg: t(`themeEditor.uiRoles.${issue.bg}`),
                    scheme: t(SCHEME_LABELS[issue.scheme]),
                    ratio: issue.ratio.toFixed(1),
                    min: issue.min,
                  })}
                </li>
              ))}
            </ul>
          )}
        </section>
      </form>
    </Dialog>
  );
}
