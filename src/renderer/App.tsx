import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { LaneMark } from './components/LaneMark';
import { UpdateNotice } from './components/UpdateNotice';
import { SUPPORTED_LOCALES } from './i18n/locale';
import { useAppStore } from './store';

export function App() {
  const { t } = useTranslation();
  const info = useAppStore((s) => s.info);

  useEffect(() => {
    window.splitwatch.rendererReady();
  }, []);

  return (
    <div className="shell">
      <header className="topbar">
        <LaneMark className="topbar-mark" />
        <span className="topbar-name">{t('app.name')}</span>
      </header>
      <main className="welcome">
        <div className="lanes" aria-hidden="true" />
        <section className="welcome-card">
          <h1>{t('welcome.title')}</h1>
          <p className="lead">{t('app.tagline')}</p>
          <p>{t('welcome.body')}</p>
          <ul className="meta">
            {info && <li>{t('welcome.version', { version: info.version })}</li>}
            <li>{t('welcome.languages', { count: SUPPORTED_LOCALES.length })}</li>
          </ul>
          <UpdateNotice />
        </section>
      </main>
    </div>
  );
}
