import { type FollowedChannel, MAX_FOLLOWED } from '../../shared/notify';
import { setPrefs, usePrefs } from './prefs';

// Following a channel: its live streams are told about (see src/main/notify.ts).
export function setFollowing(channel: FollowedChannel, on: boolean): void {
  const { notify } = usePrefs.getState();
  const others = notify.channels.filter((c) => c.id !== channel.id);
  setPrefs({ notify: { ...notify, channels: on ? [...others, channel].slice(-MAX_FOLLOWED) : others } });
}
