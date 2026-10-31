import type { BackdropKind } from '../../shared/themes';
import { useAppStore } from '../state/app';
import { usePrefs } from '../state/prefs';
import { useSession } from '../state/session';
import { useTheme } from './engine';

// Quiet sounds in the theme's style, off unless turned on in Settings: a stream comes or goes, the
// layout changes, a reminded stream is about to start. They are made here from plain tones, so no
// sound file comes with the app. Nothing sounds while the window is hidden or the app is muted.
export type Cue = 'add' | 'remove' | 'layout' | 'reminder';

interface Voice {
  wave: OscillatorType;
  // The pitch of a cue's first note, in Hz.
  base: number;
  // How long a note rings, in seconds.
  decay: number;
  // Where a note's pitch starts, as a multiple of the note: under 1 slides up into it, over 1 down.
  glide: number;
  // The level of a bell's higher partial; 0 for none.
  partial: number;
}

const VOICES = {
  soft: { wave: 'sine', base: 660, decay: 0.18, glide: 1, partial: 0 },
  drop: { wave: 'sine', base: 520, decay: 0.14, glide: 0.5, partial: 0 },
  click: { wave: 'triangle', base: 880, decay: 0.07, glide: 1, partial: 0 },
  knock: { wave: 'triangle', base: 320, decay: 0.08, glide: 1.6, partial: 0 },
  bell: { wave: 'sine', base: 1320, decay: 0.5, glide: 1, partial: 0.25 },
} satisfies Record<string, Voice>;

// Water for the pool and the sea, a click for the track, a knock on wood for the courts, a bell for
// the ice and snow; a soft tone for the rest.
export const VOICE_OF: Record<BackdropKind, keyof typeof VOICES> = {
  stripes: 'soft',
  ridges: 'soft',
  contours: 'soft',
  transition: 'soft',
  pool: 'drop',
  swell: 'drop',
  beach: 'drop',
  track: 'click',
  stadium: 'click',
  court: 'knock',
  hardwood: 'knock',
  rink: 'bell',
  slalom: 'bell',
  halfpipe: 'bell',
  aurora: 'bell',
};

// The notes of each cue, as multiples of the voice's pitch.
export const CUES: Record<Cue, number[]> = {
  add: [1, 1.5],
  remove: [1.5, 1],
  layout: [1.25],
  reminder: [1, 1.25, 1.5],
};
const GAP = 0.09;
const LEVEL = 0.05;
// A bell's partial sits at an inharmonic ratio, as a struck bar's does.
const BELL_RATIO = 2.76;

let context: AudioContext | null = null;

// force plays the cue even while the app is muted (the Settings button that tries the sounds).
export function playCue(cue: Cue, force = false): void {
  if (!usePrefs.getState().sounds) return;
  if (!force && (!useAppStore.getState().shown || useSession.getState().muted)) return;
  const ctx = (context ??= new AudioContext());
  const voice: Voice = VOICES[VOICE_OF[useTheme.getState().theme.backdrop]];
  const start = ctx.currentTime + 0.01;
  CUES[cue].forEach((step, i) => tone(ctx, voice, voice.base * step, start + i * GAP));
}

function tone(ctx: AudioContext, voice: Voice, freq: number, at: number): void {
  const envelope = ctx.createGain();
  envelope.gain.setValueAtTime(0, at);
  envelope.gain.linearRampToValueAtTime(LEVEL, at + 0.005);
  envelope.gain.exponentialRampToValueAtTime(0.0001, at + voice.decay);
  envelope.connect(ctx.destination);
  const partials: [number, number][] = voice.partial
    ? [
        [1, 1],
        [BELL_RATIO, voice.partial],
      ]
    : [[1, 1]];
  for (const [ratio, level] of partials) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = voice.wave;
    osc.frequency.setValueAtTime(freq * ratio * voice.glide, at);
    osc.frequency.exponentialRampToValueAtTime(freq * ratio, at + Math.min(0.06, voice.decay));
    gain.gain.value = level;
    osc.connect(gain);
    gain.connect(envelope);
    osc.start(at);
    osc.stop(at + voice.decay + 0.02);
  }
}

// The cues for what happens on the grid.
export function connectSounds(): void {
  useSession.subscribe((s, prev) => {
    if (s.streams.length > prev.streams.length) playCue('add');
    else if (s.streams.length < prev.streams.length) playCue('remove');
    else if (s.layout !== prev.layout) playCue('layout');
  });
}
