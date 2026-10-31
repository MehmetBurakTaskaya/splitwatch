import { useTranslation } from 'react-i18next';
import { openDialog, useAppStore } from '../state/app';
import { setPrefs, usePrefs } from '../state/prefs';
import { IconClock, IconReady } from './icons';
import { LiveNowPanel } from './LiveNowPanel';

export function EmptyState() {
  const { t } = useTranslation();
  const welcome = !usePrefs((s) => s.welcomeSeen);
  return (
    <main className="empty">
      {welcome ? (
        <Welcome />
      ) : (
        <section className="empty-card">
          <h1>{t('empty.title')}</h1>
          <p className="lead">{t('app.tagline')}</p>
          <p>{t('empty.body')}</p>
          <div className="empty-actions">
            <button type="button" className="button" onClick={() => openDialog('ready')}>
              <IconReady />
              {t('ready.title')}
            </button>
            <button
              type="button"
              className="button button-quiet"
              onClick={() => useAppStore.setState({ ambient: true })}
            >
              <IconClock />
              {t('ambient.open')}
            </button>
          </div>
        </section>
      )}
      <div className="empty-live">
        <LiveNowPanel />
      </div>
    </main>
  );
}

// The first-run guide: the three things worth knowing before the first stream, once.
function Welcome() {
  const { t } = useTranslation();
  const done = () => setPrefs({ welcomeSeen: true });
  return (
    <section className="empty-card welcome" aria-labelledby="welcome-title">
      <h1 id="welcome-title">{t('welcome.title')}</h1>
      <p className="lead">{t('app.tagline')}</p>
      <ol className="welcome-steps">
        <li>{t('welcome.add')}</li>
        <li>{t('welcome.sound')}</li>
        <li>{t('welcome.key')}</li>
        <li>{t('welcome.updates')}</li>
      </ol>
      <div className="welcome-actions">
        <button type="button" className="button" onClick={done}>
          {t('welcome.done')}
        </button>
        <button
          type="button"
          className="button button-quiet"
          onClick={() => {
            done();
            openDialog('settings');
          }}
        >
          {t('welcome.settings')}
        </button>
      </div>
    </section>
  );
}
