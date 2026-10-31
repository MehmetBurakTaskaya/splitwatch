import { useEffect } from 'react';
import { AmbientScreen } from './components/AmbientScreen';
import { Backdrop } from './components/Backdrop';
import { ChatPanel } from './components/ChatPanel';
import { ClipboardSuggestion } from './components/ClipboardSuggestion';
import { EmptyState } from './components/EmptyState';
import { EndedSuggestion } from './components/EndedSuggestion';
import { EventDialog } from './components/EventDialog';
import { FollowImportDialog } from './components/FollowImportDialog';
import { Grid } from './components/Grid';
import { HistoryDialog } from './components/HistoryDialog';
import { Intro } from './components/Intro';
import { LayoutsDialog } from './components/LayoutsDialog';
import { ReadyListsDialog } from './components/ReadyListsDialog';
import { SearchPalette } from './components/SearchPalette';
import { SettingsDialog } from './components/SettingsDialog';
import { SharedDialog } from './components/SharedDialog';
import { ShortcutsDialog } from './components/ShortcutsDialog';
import { SportDialog } from './components/SportDialog';
import { SyncPanel } from './components/SyncPanel';
import { ThemeEditorDialog } from './components/ThemeEditorDialog';
import { TopBar } from './components/TopBar';
import { UpcomingDialog } from './components/UpcomingDialog';
import { UpdateNotice } from './components/UpdateNotice';
import { useIframeFocus, useShortcuts } from './hooks/useShortcuts';
import { useAppStore } from './state/app';
import { useEvents } from './state/events';
import { useSession } from './state/session';

export function App() {
  const hasStreams = useSession((s) => s.streams.length > 0);
  const ambient = useAppStore((s) => s.ambient) && !hasStreams;
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
      {!mini && !ambient && <TopBar />}
      {!mini && !ambient && <ClipboardSuggestion />}
      {!mini && <EndedSuggestion />}
      {hasStreams ? (
        <div className="stage">
          <Grid />
          {!mini && <ChatPanel />}
          {!mini && <SyncPanel />}
        </div>
      ) : ambient ? (
        <AmbientScreen />
      ) : (
        <EmptyState />
      )}
      {!mini && <UpdateNotice />}
      {dialog === 'search' && <SearchPalette />}
      {dialog === 'shortcuts' && <ShortcutsDialog />}
      {dialog === 'settings' && <SettingsDialog />}
      {dialog === 'sport' && <SportDialog />}
      {dialog === 'layouts' && <LayoutsDialog />}
      {dialog === 'ready' && <ReadyListsDialog />}
      {dialog === 'event' && <EventDialog />}
      {dialog === 'upcoming' && <UpcomingDialog />}
      {dialog === 'shared' && <SharedDialog />}
      {dialog === 'themeEditor' && <ThemeEditorDialog />}
      {dialog === 'history' && <HistoryDialog />}
      {dialog === 'importFollows' && <FollowImportDialog />}
      <Intro />
    </div>
  );
}
