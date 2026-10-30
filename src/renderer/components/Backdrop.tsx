import { useEffect, useRef } from 'react';
import { layoutById } from '../../shared/layouts';
import { usePrefs } from '../state/prefs';
import { useSession } from '../state/session';
import { useTheme } from '../theme/engine';
import { type Motion, Painter } from '../theme/painter';

// The theme's drawn background, behind the whole window. It shows on the start screen, in empty
// places of the grid and in the gaps between tiles; it never covers a player. It moves only while
// enough of it shows: fully on the start screen, slowly next to empty places, not at all when the
// players fill the grid.
export function Backdrop() {
  const host = useRef<HTMLDivElement>(null);
  const painter = useRef<Painter | null>(null);
  const theme = useTheme((s) => s.theme);
  const scheme = useTheme((s) => s.scheme);
  const reducedMotion = useTheme((s) => s.reducedMotion);
  const animate = usePrefs((s) => s.animate);
  const low = usePrefs((s) => s.performance);
  const streams = useSession((s) => s.streams.length);
  const openSlots = useSession((s) => !s.maximized && layoutById(s.layout).capacity > s.streams.length);

  const still = !animate || low || reducedMotion;
  const motion: Motion = still ? 'still' : streams === 0 ? 'full' : openSlots ? 'slow' : 'still';

  useEffect(() => {
    painter.current = new Painter(host.current!);
    return () => {
      painter.current?.destroy();
      painter.current = null;
    };
  }, []);

  useEffect(() => {
    painter.current?.update({ theme, scheme, low, motion, fade: !low && !reducedMotion });
  }, [theme, scheme, low, motion, reducedMotion]);

  return <div ref={host} className="backdrop" aria-hidden="true" />;
}
