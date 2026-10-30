import { useTranslation } from 'react-i18next';
import { useYouTube } from '../state/youtube';
import { StreamList } from './StreamList';

// Live and upcoming streams of the preset channels, or their newest videos without a key.
export function LiveNowPanel({ limit = 12 }: { limit?: number }) {
  const { t } = useTranslation();
  const liveNow = useYouTube((s) => s.liveNow);
  const loading = useYouTube((s) => s.liveLoading);
  const title = liveNow?.mode === 'latest' ? t('live.latestTitle') : t('live.title');

  return (
    <section className="live-now" aria-busy={loading}>
      <h2>{title}</h2>
      {liveNow?.mode === 'latest' && <p className="note">{t('live.latestNote')}</p>}
      {!liveNow && loading && <p className="note">{t('live.loading')}</p>}
      {liveNow && liveNow.items.length === 0 && <p className="note">{t('live.none')}</p>}
      {liveNow && liveNow.items.length > 0 && <StreamList items={liveNow.items.slice(0, limit)} label={title} />}
    </section>
  );
}
