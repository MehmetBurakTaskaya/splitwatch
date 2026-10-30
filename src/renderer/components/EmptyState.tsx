import { useTranslation } from 'react-i18next';

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
    </main>
  );
}
