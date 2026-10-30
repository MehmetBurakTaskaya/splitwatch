import { setMini } from '../hooks/useShortcuts';
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
    }
  });
}
