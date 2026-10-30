import { type FormEvent, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { SearchResult, StreamItem } from '../../shared/ipc';
import { parseVideoId } from '../../shared/youtube';
import { openDialog } from '../state/app';
import { useSession } from '../state/session';
import { useYouTube } from '../state/youtube';
import { Dialog } from './Dialog';
import { LiveNowPanel } from './LiveNowPanel';
import { StreamList } from './StreamList';

const matches = (item: StreamItem, words: string[]) =>
  words.every((w) => `${item.title} ${item.channel}`.toLocaleLowerCase().includes(w));

// Ctrl/Cmd + K. Local suggestions first (no quota); Enter searches YouTube for live streams.
export function SearchPalette() {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [sport, setSport] = useState<string | null>(null);
  const [result, setResult] = useState<{ query: string; value: SearchResult } | null>(null);
  const [busy, setBusy] = useState(false);
  const status = useYouTube((s) => s.status);
  const presets = useYouTube((s) => s.presets);
  const liveNow = useYouTube((s) => s.liveNow);
  const history = useYouTube((s) => s.history);

  const link = parseVideoId(query);
  const sports = useMemo(() => [...new Set(presets.map((p) => p.sport))], [presets]);
  const words = useMemo(() => query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean), [query]);
  const suggestions = useMemo(() => {
    if (!words.length || link) return [];
    const pool = [...(liveNow?.items ?? []), ...history];
    const seen = new Set<string>();
    return pool
      .filter((item) => !seen.has(item.videoId) && seen.add(item.videoId))
      .filter((item) => (!sport || item.sport === sport) && matches(item, words))
      .slice(0, 8);
  }, [words, sport, liveNow, history, link]);

  const keyOk = status?.key === 'valid';
  const searchesLeft = status
    ? status.exhausted.includes('searches')
      ? 0
      : Math.max(0, status.limits.searches - status.used.searches)
    : 0;
  const resetsAt = status ? new Date(status.resetsAt) : new Date();

  const run = async (e?: FormEvent) => {
    e?.preventDefault();
    if (link) {
      useSession.getState().add(link);
      setQuery('');
      return;
    }
    if (!words.length || !keyOk || searchesLeft === 0) return;
    setBusy(true);
    try {
      setResult({ query: query.trim(), value: await window.splitwatch.search(query, sport) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog title={t('search.title')} onClose={() => openDialog(null)} wide>
      <form className="palette-form" onSubmit={run}>
        <input
          type="text"
          data-autofocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label={t('search.label')}
          placeholder={t('search.placeholder')}
          spellCheck={false}
          autoComplete="off"
          dir="auto"
        />
        {link && (
          <button type="submit" className="button">
            {t('search.addLink')}
          </button>
        )}
      </form>

      {sports.length > 0 && (
        <div className="chips" role="group" aria-label={t('settings.sports')}>
          <button type="button" className="chip" aria-pressed={sport === null} onClick={() => setSport(null)}>
            {t('search.allSports')}
          </button>
          {sports.map((s) => (
            <button key={s} type="button" className="chip" aria-pressed={sport === s} onClick={() => setSport(s)}>
              {t(`sports.${s}`, s)}
            </button>
          ))}
        </div>
      )}

      {suggestions.length > 0 && (
        <>
          <h3>{t('search.suggestions')}</h3>
          <StreamList items={suggestions} label={t('search.suggestions')} />
        </>
      )}

      {words.length > 0 && !link && (
        <div className="palette-search">
          {keyOk && searchesLeft > 0 && (
            <>
              <button type="button" className="button" disabled={busy} onClick={() => void run()}>
                {busy ? t('search.searching') : t('search.run', { query: query.trim() })}
              </button>
              <span className="note">{t('search.cost', { limit: status!.limits.searches, left: searchesLeft })}</span>
            </>
          )}
          {keyOk && searchesLeft === 0 && <p className="note">{t('search.noSearchesLeft', { time: resetsAt })}</p>}
          {!keyOk && (
            <>
              <span className="note">{t('search.noKey')}</span>
              <button type="button" className="button button-quiet" onClick={() => openDialog('settings')}>
                {t('search.openSettings')}
              </button>
            </>
          )}
        </div>
      )}

      {result && (
        <>
          <h3>{t('search.results')}</h3>
          {result.value.ok && result.value.items.length > 0 && (
            <StreamList items={result.value.items} label={t('search.results')} />
          )}
          {result.value.ok && result.value.items.length === 0 && <p className="note">{t('search.nothing')}</p>}
          {!result.value.ok && (
            <p className="dialog-problem" role="alert">
              {t(`search.failed.${result.value.reason}`, { time: resetsAt })}
            </p>
          )}
        </>
      )}

      {!words.length && !result && <LiveNowPanel limit={8} />}

      <div className="dialog-actions">
        <button type="button" className="button button-quiet" onClick={() => openDialog(null)}>
          {t('search.close')}
        </button>
      </div>
    </Dialog>
  );
}
