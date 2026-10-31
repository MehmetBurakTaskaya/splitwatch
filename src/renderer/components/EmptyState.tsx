import { useTranslation } from 'react-i18next';
import { useAppStore } from '../state/app';
import { IconClock } from './icons';
import { LiveNowPanel } from './LiveNowPanel';

export function EmptyState() {
  const { t } = useTranslation();
  return (
    <main className="empty">
      <section className="empty-card">
        <h1>{t('empty.title')}</h1>
        <p className="lead">{t('app.tagline')}</p>
        <p>{t('empty.body')}</p>
        <button type="button" className="button button-quiet" onClick={() => useAppStore.setState({ ambient: true })}>
          <IconClock />
          {t('ambient.open')}
        </button>
      </section>
      <div className="empty-live">
        <LiveNowPanel />
      </div>
    </main>
  );
}
