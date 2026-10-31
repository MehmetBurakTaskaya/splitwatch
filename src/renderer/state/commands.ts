import { setMini } from '../hooks/useShortcuts';
import { togglePlay } from '../player/players';
import { useAppStore } from './app';
import { playCue } from '../theme/sounds';
import { usePrefs } from './prefs';
import { useSession } from './session';

// Asks from the tray and the notifications.
export function connectCommands(): void {
  useSession.subscribe((s) => {
    const { chat, ambient } = useAppStore.getState();
    if (chat && !s.streams.includes(chat)) useAppStore.setState({ chat: null });
    // A stream on the grid ends the waiting.
    if (ambient && s.streams.length) useAppStore.setState({ ambient: false });
  });
  // A popped-out stream's window closed: the stream is back in the grid.
  window.splitwatch.onPopoutClosed((videoId) => useSession.getState().popIn(videoId));
  window.splitwatch.onCommand((command) => {
    const session = useSession.getState();
    switch (command.type) {
      case 'add': {
        // The new stream has to be on screen to play.
        if (useAppStore.getState().mini) setMini(false);
        const result = session.add(command.videoId, command.sport);
        if (result !== 'full') session.select(command.videoId);
        return;
      }
      case 'toggleMute':
        return session.toggleMute();
      case 'mini':
        return setMini(true);
      case 'playPause':
        return togglePlay(session.selected);
      case 'selectNext':
      case 'selectPrevious': {
        const { streams, selected } = session;
        if (!streams.length) return;
        const step = command.type === 'selectNext' ? 1 : -1;
        const index = (streams.indexOf(selected ?? '') + step + streams.length) % streams.length;
        return session.select(streams[index]!, { unmute: true });
      }
      case 'reminders':
        usePrefs.setState({ reminders: command.reminders });
        if (command.fired) playCue('reminder');
        return;
      case 'sharedLayout':
        if (useAppStore.getState().mini) setMini(false);
        return useAppStore.setState({ shared: command.layout, dialog: 'shared', dialogStream: null });
    }
  });
}
