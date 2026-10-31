import { setMini } from '../hooks/useShortcuts';
import { togglePlay } from '../player/players';
import { useAppStore } from './app';
import { useSession } from './session';

// Asks from the tray and the notifications.
export function connectCommands(): void {
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
      case 'sharedLayout':
        if (useAppStore.getState().mini) setMini(false);
        return useAppStore.setState({ shared: command.layout, dialog: 'shared', dialogStream: null });
    }
  });
}
