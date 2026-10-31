import { useTranslation } from 'react-i18next';
import { APP_ID } from '../../shared/app';
import { liveChatUrl } from '../../shared/youtube';
import { useAppStore } from '../state/app';
import { useSession } from '../state/session';
import { useTheme } from '../theme/engine';
import { IconClose, IconExternal } from './icons';

// YouTube's live chat of a stream, read-only beside the grid. YouTube's chat embed takes the
// embedding site's name (embed_domain), which is the name the app gives YouTube (the Referer). Writing
// in the chat needs a Google sign-in, which the app does not offer: the chat's sign-in button may ask
// to leave the app (by user activation only), and the main process opens the chat in the browser instead.
export function ChatPanel() {
  const { t } = useTranslation();
  const videoId = useAppStore((s) => s.chat);
  const dark = useTheme((s) => s.scheme === 'dark');
  const info = useSession((s) => (videoId ? s.info[videoId] : null));
  if (!videoId) return null;
  const params = new URLSearchParams({ v: videoId, embed_domain: APP_ID, ...(dark ? { dark_theme: '1' } : {}) });

  return (
    <aside className="chat" aria-label={t('chat.title')}>
      <div className="chat-head">
        <span className="chat-title">
          <strong>{t('chat.title')}</strong>
          {info?.title && (
            <span className="spoiler" dir="auto">
              {info.title}
            </span>
          )}
        </span>
        <a
          className="icon-button"
          href={liveChatUrl(videoId)}
          target="_blank"
          rel="noreferrer"
          aria-label={t('chat.browser')}
          title={t('chat.browser')}
        >
          <IconExternal />
        </a>
        <button
          type="button"
          className="icon-button"
          aria-label={t('chat.close')}
          title={t('chat.close')}
          onClick={() => useAppStore.setState({ chat: null })}
        >
          <IconClose />
        </button>
      </div>
      <iframe
        key={`${videoId}-${dark}`}
        title={t('chat.title')}
        src={`https://www.youtube.com/live_chat?${params}`}
        sandbox="allow-scripts allow-same-origin allow-popups allow-top-navigation-by-user-activation"
      />
    </aside>
  );
}
