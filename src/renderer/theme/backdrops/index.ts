import type { BackdropKind, EventKind } from '../../../shared/themes';
import { aurora, stadium, summerFrame, winterFrame } from './games';
import { beach, court, hardwood, rink } from './courts';
import { type Backdrop, fill } from './kit';
import { halfpipe, slalom } from './snow';
import { contours, ridges, track, transition } from './tracks';
import { pool, swell } from './water';

export type { Backdrop, Frame } from './kit';

// The neutral theme's lanes: thin vertical lines, as the start screen always had.
function stripes(): Backdrop {
  return {
    still(f) {
      fill(f, f.scene.base);
      f.ctx.fillStyle = f.scene.line;
      for (let x = 119; x < f.w; x += 121) f.ctx.fillRect(x, 0, 2, f.h);
    },
  };
}

export const BACKDROP_FACTORIES: Record<BackdropKind, () => Backdrop> = {
  stripes,
  pool,
  track,
  transition,
  ridges,
  contours,
  court,
  beach,
  hardwood,
  swell,
  rink,
  slalom,
  halfpipe,
  stadium,
  aurora,
};

// Drawn over a sport's backdrop while an event mode is on.
export const EVENT_FRAMES: Record<EventKind, () => Backdrop> = { summer: summerFrame, winter: winterFrame };
