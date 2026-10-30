import { useTranslation } from 'react-i18next';
import { useAppStore } from '../store';

export function UpdateNotice() {
  const { t } = useTranslation();
  const update = useAppStore((s) => s.update);

  switch (update.status) {
    case 'idle':
      return null;
    case 'checking':
    case 'none':
    case 'error':
      return (
        <p className="update" role="status">
          {t(`update.${update.status}`)}
        </p>
      );
    case 'downloading':
      return (
        <p className="update" role="status">
          {t('update.downloading', { progress: update.progress })}
        </p>
      );
    case 'available':
      return (
        <div className="update" role="status">
          <span>{t('update.available', { version: update.version })}</span>
          {!update.canInstall && (
            <button type="button" onClick={() => void window.splitwatch.openReleasePage()}>
              {t('update.download')}
            </button>
          )}
        </div>
      );
    case 'ready':
      return (
        <div className="update" role="status">
          <span>{t('update.ready', { version: update.version })}</span>
          <button type="button" onClick={() => void window.splitwatch.installUpdate()}>
            {t('update.restart')}
          </button>
        </div>
      );
  }
}
