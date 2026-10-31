import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { isVideoId } from '../shared/youtube';
import { App } from './App';
import { PopoutView } from './components/PopoutView';
import { changeLocale, initI18n } from './i18n';
import { connectHost } from './state/app';
import { connectCommands } from './state/commands';
import { connectEvents } from './state/events';
import { loadPrefs, loadState } from './state/init';
import { connectWatch } from './state/watch';
import { connectYouTube } from './state/youtube';
import { connectTheme } from './theme/engine';
import { connectSounds } from './theme/sounds';
import './styles/tokens.css';
import './styles/base.css';
import './styles/grid.css';
import './styles/lists.css';

const params = new URLSearchParams(location.search);
const requested = params.get('locale');
// A popped-out stream's window shows one player; it reads the settings but never writes the session.
const popout = params.get('popout');
const live = params.get('live') === '1';

if (popout && isVideoId(popout)) {
  void Promise.all([initI18n(requested), loadPrefs()]).then(() => {
    window.splitwatch.onLocaleChange((lng) => void changeLocale(lng));
    connectTheme();
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <PopoutView videoId={popout} live={live} />
      </StrictMode>,
    );
  });
} else {
  void Promise.all([initI18n(requested), loadState()]).then(() => {
    window.splitwatch.onLocaleChange((lng) => void changeLocale(lng));
    connectHost();
    connectCommands();
    connectEvents();
    connectYouTube();
    connectTheme();
    connectWatch();
    connectSounds();
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  });
}
