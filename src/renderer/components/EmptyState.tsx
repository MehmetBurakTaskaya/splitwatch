import { useTranslation } from 'react-i18next';
import { LiveNowPanel } from './LiveNowPanel';

export function EmptyState() {
  const { t } = useTranslation();
  return (
    <main className="empty">
      <div className="lanes" aria-hidden="true" />
      <section className="empty-card">
        <h1>{t('empty.title')}</h1>
        <p className="lead">{t('app.tagline')}</p>
        <p>{t('empty.body')}</p>
      </section>
      <div className="empty-live">
        <LiveNowPanel />
      </div>
    </main>
  );
}
