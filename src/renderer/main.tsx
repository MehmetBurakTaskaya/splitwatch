import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { initI18n } from './i18n';
import { connectHost } from './state/app';
import { loadState } from './state/init';
import { connectYouTube } from './state/youtube';
import './styles/tokens.css';
import './styles/base.css';
import './styles/grid.css';
import './styles/lists.css';

const requested = new URLSearchParams(location.search).get('locale');

void Promise.all([initI18n(requested), loadState()]).then(() => {
  connectHost();
  connectYouTube();
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
