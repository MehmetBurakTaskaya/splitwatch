import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSession } from '../state/session';
import { useYouTube } from '../state/youtube';
import { streamSport } from '../theme/engine';

// When a stream ends, offer the next live stream of its sport from the preset channels (with a key,
// Live now knows which are live). It never starts by itself: the user picks it.
export function EndedSuggestion() {
  const { t } = useTranslation();
  const [dismissed, setDismissed] = useState<string[]>([]);
  const streams = useSession((s) => s.streams);
  const status = useSession((s) => s.status);
  const liveNow = useYouTube((s) => s.liveNow);
  // Read so the offer follows the sports the app finds.
  useYouTube((s) => s.streamSports);

  const live = liveNow?.mode === 'live' ? liveNow.items.filter((i) => i.live === 'live') : [];
  let offer: { ended: string; index: number; sport: string; next: (typeof live)[number] } | null = null;
  for (const [index, id] of streams.entries()) {
    if (status[id]?.state !== 'ended' || dismissed.includes(id)) continue;
    const sport = streamSport(id);
    const next = sport ? live.find((i) => i.sport === sport && !streams.includes(i.videoId)) : undefined;
    if (sport && next) {
      offer = { ended: id, index, sport, next };
      break;
    }
  }
  if (!offer) return null;
  const { ended, index, sport, next } = offer;

  return (
    <div className="banner" role="status">
      <span>{t('ended.prompt', { index: index + 1, sport: t(`sports.${sport}`, sport) })}</span>
      <span className="banner-detail spoiler" dir="auto">
        {next.title}
      </span>
      <button
        type="button"
        className="button"
        onClick={() => useSession.getState().replace(ended, next.videoId, sport)}
      >
        {t('ended.replace')}
      </button>
      <button type="button" className="button button-quiet" onClick={() => setDismissed([...dismissed, ended])}>
        {t('ended.dismiss')}
      </button>
    </div>
  );
}
