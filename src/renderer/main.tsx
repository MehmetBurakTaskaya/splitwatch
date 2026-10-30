import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { initI18n } from './i18n';
import { connectHost } from './store';
import './styles/tokens.css';
import './styles/base.css';

const requested = new URLSearchParams(location.search).get('locale');

void initI18n(requested).then(() => {
  connectHost();
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
