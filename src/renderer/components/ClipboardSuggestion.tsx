import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { VideoInfo } from '../../shared/ipc';
import { usePrefs } from '../state/prefs';
import { useSession } from '../state/session';

// When the window gains focus and the clipboard holds a YouTube link that is not in the grid,
// offer to add it, once per link.
export function ClipboardSuggestion() {
  const { t } = useTranslation();
  const enabled = usePrefs((s) => s.clipboardSuggestions);
  const [offer, setOffer] = useState<{ id: string; info: VideoInfo | null } | null>(null);

  useEffect(() => {
    if (!enabled) {
      setOffer(null);
      return;
    }
    const seen = new Set<string>();
    const check = async () => {
      const id = await window.splitwatch.readClipboardVideo();
      if (!id || seen.has(id) || useSession.getState().streams.includes(id)) return;
      seen.add(id);
      setOffer({ id, info: null });
      const info = await window.splitwatch.getVideoInfo(id);
      setOffer((o) => (o?.id === id ? { id, info } : o));
    };
    void check();
    window.addEventListener('focus', check);
    return () => window.removeEventListener('focus', check);
  }, [enabled]);

  if (!offer) return null;
  return (
    <div className="banner" role="status">
      <span>{t('clipboard.prompt')}</span>
      {offer.info && (
        <span className="banner-detail spoiler" dir="auto">
          {offer.info.title}
        </span>
      )}
      <button
        type="button"
        className="button"
        onClick={() => {
          useSession.getState().add(offer.id);
          setOffer(null);
        }}
      >
        {t('clipboard.add')}
      </button>
      <button type="button" className="button button-quiet" onClick={() => setOffer(null)}>
        {t('clipboard.dismiss')}
      </button>
    </div>
  );
}
