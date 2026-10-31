import { useEffect } from 'react';
import { Backdrop } from './components/Backdrop';
import { ClipboardSuggestion } from './components/ClipboardSuggestion';
import { EmptyState } from './components/EmptyState';
import { EventDialog } from './components/EventDialog';
import { Grid } from './components/Grid';
import { Intro } from './components/Intro';
import { LayoutsDialog } from './components/LayoutsDialog';
import { SearchPalette } from './components/SearchPalette';
import { SettingsDialog } from './components/SettingsDialog';
import { ShortcutsDialog } from './components/ShortcutsDialog';
import { SportDialog } from './components/SportDialog';
import { TopBar } from './components/TopBar';
import { UpdateNotice } from './components/UpdateNotice';
import { useIframeFocus, useShortcuts } from './hooks/useShortcuts';
import { useAppStore } from './state/app';
import { useEvents } from './state/events';
import { useSession } from './state/session';

export function App() {
  const hasStreams = useSession((s) => s.streams.length > 0);
  const dialog = useAppStore((s) => s.dialog);
  const mini = useAppStore((s) => s.mini);
  const intro = useEvents((s) => s.intro !== null);
  useShortcuts();
  useIframeFocus();

  useEffect(() => {
    window.splitwatch.rendererReady();
  }, []);

  return (
    <div className="shell" data-intro={intro || undefined} data-dialog={dialog ? true : undefined}>
      <Backdrop />
      {!mini && <TopBar />}
      {!mini && <ClipboardSuggestion />}
      {hasStreams ? <Grid /> : <EmptyState />}
      {!mini && <UpdateNotice />}
      {dialog === 'search' && <SearchPalette />}
      {dialog === 'shortcuts' && <ShortcutsDialog />}
      {dialog === 'settings' && <SettingsDialog />}
      {dialog === 'sport' && <SportDialog />}
      {dialog === 'layouts' && <LayoutsDialog />}
      {dialog === 'event' && <EventDialog />}
      <Intro />
    </div>
  );
}
