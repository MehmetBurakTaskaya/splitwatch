import { useTranslation } from 'react-i18next';
import { useAppStore } from '../state/app';

// Shown only when there is something to act on: a new version, its download, or a restart.
export function UpdateNotice() {
  const { t } = useTranslation();
  const update = useAppStore((s) => s.update);

  switch (update.status) {
    case 'downloading':
      return (
        <div className="banner banner-quiet" role="status">
          {t('update.downloading', { progress: update.progress })}
        </div>
      );
    case 'available':
      return (
        <div className="banner banner-quiet" role="status">
          <span>
            {update.reason === 'move'
              ? t('update.move', { version: update.version })
              : t('update.available', { version: update.version })}
          </span>
          {!update.canInstall && update.reason !== 'move' && (
            <button type="button" className="button" onClick={() => void window.splitwatch.openReleasePage()}>
              {t('update.download')}
            </button>
          )}
        </div>
      );
    case 'ready':
      return (
        <div className="banner banner-quiet" role="status">
          <span>{t('update.ready', { version: update.version })}</span>
          <button type="button" className="button" onClick={() => void window.splitwatch.installUpdate()}>
            {t('update.restart')}
          </button>
        </div>
      );
    default:
      return null;
  }
}
