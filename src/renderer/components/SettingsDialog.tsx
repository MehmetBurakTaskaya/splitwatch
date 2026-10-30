import { useTranslation } from 'react-i18next';
import { openDialog, useAppStore } from '../state/app';
import { setPrefs, usePrefs } from '../state/prefs';
import { Dialog } from './Dialog';

export function SettingsDialog() {
  const { t } = useTranslation();
  const audioFocus = usePrefs((s) => s.audioFocus);
  const clipboard = usePrefs((s) => s.clipboardSuggestions);
  const version = useAppStore((s) => s.info?.version);

  return (
    <Dialog title={t('settings.title')} onClose={() => openDialog(null)}>
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
      <label className="field">
        <input
          type="checkbox"
          checked={clipboard}
          onChange={(e) => setPrefs({ clipboardSuggestions: e.target.checked })}
        />
        {t('settings.clipboard')}
      </label>
      {version && <p className="dialog-meta">{t('settings.version', { version })}</p>}
      <div className="dialog-actions">
        <button type="button" className="button" onClick={() => openDialog(null)}>
          {t('settings.close')}
        </button>
      </div>
    </Dialog>
  );
}
