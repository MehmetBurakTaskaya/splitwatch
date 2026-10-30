import { useEffect } from 'react';
import { Backdrop } from './components/Backdrop';
import { ClipboardSuggestion } from './components/ClipboardSuggestion';
import { EmptyState } from './components/EmptyState';
import { Grid } from './components/Grid';
import { LayoutsDialog } from './components/LayoutsDialog';
import { SearchPalette } from './components/SearchPalette';
import { SettingsDialog } from './components/SettingsDialog';
import { ShortcutsDialog } from './components/ShortcutsDialog';
import { SportDialog } from './components/SportDialog';
import { TopBar } from './components/TopBar';
import { UpdateNotice } from './components/UpdateNotice';
import { useIframeFocus, useShortcuts } from './hooks/useShortcuts';
import { useAppStore } from './state/app';
import { useSession } from './state/session';

export function App() {
  const hasStreams = useSession((s) => s.streams.length > 0);
  const dialog = useAppStore((s) => s.dialog);
  useShortcuts();
  useIframeFocus();

  useEffect(() => {
    window.splitwatch.rendererReady();
  }, []);

  return (
    <div className="shell">
      <Backdrop />
      <TopBar />
      <ClipboardSuggestion />
      {hasStreams ? <Grid /> : <EmptyState />}
      <UpdateNotice />
      {dialog === 'search' && <SearchPalette />}
      {dialog === 'shortcuts' && <ShortcutsDialog />}
      {dialog === 'settings' && <SettingsDialog />}
      {dialog === 'sport' && <SportDialog />}
      {dialog === 'layouts' && <LayoutsDialog />}
    </div>
  );
}
