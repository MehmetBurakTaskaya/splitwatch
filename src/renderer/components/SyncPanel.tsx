import { useTranslation } from 'react-i18next';
import { delayBy } from '../player/players';
import { useAppStore } from '../state/app';
import { useSession } from '../state/session';
import { IconClose } from './icons';

const STEPS = [-5, -1, 1, 5];

// Lines up streams of the same moment that reach the viewer with different delays: a stream that
// runs ahead is held back by rewinding it. Beside the grid, so that the streams stay in sight.
export function SyncPanel() {
  const { t } = useTranslation();
  const open = useAppStore((s) => s.sync);
  const streams = useSession((s) => s.streams);
  const popped = useSession((s) => s.popped);
  const delays = useSession((s) => s.delays);
  const info = useSession((s) => s.info);
  if (!open) return null;

  return (
    <aside className="side sync" aria-label={t('sync.title')}>
      <div className="side-head">
        <span className="side-title">
          <strong>{t('sync.title')}</strong>
          <span>{t('sync.experimental')}</span>
        </span>
        <button
          type="button"
          className="icon-button"
          aria-label={t('sync.close')}
          title={t('sync.close')}
          onClick={() => useAppStore.setState({ sync: false })}
        >
          <IconClose />
        </button>
      </div>
      <div className="sync-body">
        <p className="sync-intro">{t('sync.intro')}</p>
        <ol className="sync-list">
          {streams
            .filter((id) => !popped.includes(id))
            .map((id) => {
              const n = streams.indexOf(id) + 1;
              const delay = delays[id] ?? 0;
              return (
                <li key={id} className="sync-row" data-sync={id}>
                  <span className="sync-name">
                    <span className="sync-index">{n}</span>
                    <span className="spoiler" dir="auto">
                      {info[id]?.title ?? t('tile.loading')}
                    </span>
                    <output>{t('sync.delay', { seconds: delay })}</output>
                  </span>
                  <div className="sync-controls" role="group" aria-label={t('sync.stream', { index: n })}>
                    {STEPS.map((step) => (
                      <button
                        key={step}
                        type="button"
                        className="button button-quiet"
                        // The visible text is the name (in the group of the stream); the title says more.
                        title={
                          step > 0
                            ? t('sync.later', { index: n, seconds: step })
                            : t('sync.sooner', { index: n, seconds: -step })
                        }
                        disabled={step < 0 && delay === 0}
                        onClick={() => delayBy(id, step)}
                      >
                        {step > 0 ? t('sync.plus', { seconds: step }) : t('sync.minus', { seconds: -step })}
                      </button>
                    ))}
                    <button
                      type="button"
                      className="button button-quiet"
                      title={t('sync.resetLabel', { index: n })}
                      disabled={delay === 0}
                      onClick={() => delayBy(id, -delay)}
                    >
                      {t('sync.reset')}
                    </button>
                  </div>
                </li>
              );
            })}
        </ol>
      </div>
    </aside>
  );
}
