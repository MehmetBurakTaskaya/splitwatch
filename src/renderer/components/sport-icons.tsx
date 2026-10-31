// Line icons for the preset sports, on the same 20 x 20 grid as icons.tsx. Each shows an object of
// the sport (a ball, goggles, a paddle) and never a person, so none resembles the pictograms of any
// sports event or body. Decorative: the control around an icon carries its name.
import type { ReactNode } from 'react';

const SPORT_PATHS: Record<string, ReactNode> = {
  volleyball: (
    <>
      <circle cx="10" cy="10" r="7" />
      <path d="M10 10c0-3 1.5-5.5 4.2-6.6M10 10c-2.6 1.5-5.6 1.6-7.8.3M10 10c2.6 1.5 4 4.2 3.8 6.9" />
    </>
  ),
  'beach-volleyball': (
    <>
      <circle cx="11.5" cy="7.5" r="4.5" />
      <path d="M11.5 7.5c0-2 1-3.6 2.8-4.3M11.5 7.5c-1.7 1-3.7 1-5 .2M11.5 7.5c1.7 1 2.6 2.7 2.5 4.5" />
      <path d="M2.5 16.5c1.8-1 3.2 1 5 0s3.2 1 5 0 3.2 1 5 0" />
    </>
  ),
  triathlon: (
    <>
      <path d="M3 5.5c1.3-.9 2.4.9 3.7 0s2.4.9 3.7 0" />
      <circle cx="6" cy="13.5" r="3" />
      <circle cx="6" cy="13.5" r="0.6" className="fill" />
      <circle cx="14.5" cy="12.5" r="3.2" />
      <path d="M14.5 12.5v-1.8M13.5 8.2h2M14.5 8.2v1.1" />
    </>
  ),
  athletics: (
    <>
      <path d="M6.5 4.5h7a5.5 5.5 0 0 1 0 11h-7a5.5 5.5 0 0 1 0-11z" />
      <path d="M6.8 8h6.4a2 2 0 0 1 0 4H6.8a2 2 0 0 1 0-4z" />
    </>
  ),
  'road-cycling': (
    <>
      <circle cx="5" cy="13.5" r="3.2" />
      <circle cx="15" cy="13.5" r="3.2" />
      <path d="M5 13.5h4.5L7.8 8.2zM9.5 13.5l4-5.3H7.8M13.5 8.2l1.5 5.3M6.8 8.2h2.2M13.5 8.2l.5-1.7h1.8" />
    </>
  ),
  'mountain-bike': (
    <>
      <path d="M2 16.5l4.5-7.5 2.8 3.8 2.1-2.8 1.4 1.8" />
      <circle cx="14.5" cy="13.5" r="3.4" />
      <path d="M14.5 9.4v.8M14.5 16.8v.8M10.4 13.5h.8M17.8 13.5h.8" />
    </>
  ),
  swimming: (
    <>
      <ellipse cx="6" cy="9" rx="3.2" ry="2.4" />
      <ellipse cx="14" cy="9" rx="3.2" ry="2.4" />
      <path d="M9.2 9h1.6M2.8 9H1.6M17.2 9h1.2M3 15c1.4-.9 2.6.9 4 0s2.6.9 4 0 2.6.9 4 0" />
    </>
  ),
  'alpine-skiing': (
    <>
      <path d="M7 3.5v11M13 3.5v11M7 4h6v4.5H7z" />
      <path d="M2.5 17.5c3-1.2 5.2-.2 7.5-1.6s4.6-1 7.5-2" />
    </>
  ),
  snowboard: (
    <g transform="rotate(-20 10 10)">
      <path d="M2.2 9.8c.5 1.6 1.6 2.4 3 2.4h9.6c1.4 0 2.5-.8 3-2.4" />
      <path d="M6.6 12.2V9.4h2.6v2.8M10.8 12.2V9.4h2.6v2.8" />
    </g>
  ),
  'ice-hockey': (
    <>
      <path d="M5.5 2.5l6.2 11.3c.4.7 1.1 1.2 1.9 1.2h3.4" />
      <ellipse cx="6" cy="15" rx="2.8" ry="1.2" />
      <path d="M3.2 15v1.2c0 .7 1.3 1.2 2.8 1.2s2.8-.5 2.8-1.2V15" />
    </>
  ),
  'table-tennis': (
    <>
      <circle cx="8" cy="8" r="4.8" />
      <path d="M11.4 11.4l4.4 4.4" className="thick" />
      <circle cx="15.5" cy="4.5" r="1.4" />
    </>
  ),
  // A racket with strings, longer than the table-tennis paddle, and a ball with its seam.
  tennis: (
    <>
      <ellipse cx="7.6" cy="7.6" rx="3.6" ry="4.8" transform="rotate(-45 7.6 7.6)" />
      <path d="M5 7.6l5.2 0M7.6 5v5.2" />
      <path d="M10.4 10.4l5.6 5.6" className="thick" />
      <circle cx="15.2" cy="4.8" r="2" />
      <path d="M13.4 4.1c.9.4 2.7.4 3.6 0" />
    </>
  ),
  badminton: (
    <>
      <path d="M8 15.5a2 2 0 0 0 4 0z" />
      <path d="M8 15.5L5 5M12 15.5L15 5M9.3 15.5L8.3 5M10.7 15.5l1-10.5M5 5c1.7-.7 8.3-.7 10 0" />
    </>
  ),
  wrestling: (
    <>
      <circle cx="10" cy="10" r="7.5" />
      <circle cx="10" cy="10" r="4.8" />
      <circle cx="10" cy="10" r="1.2" />
    </>
  ),
  rowing: (
    <>
      <path d="M3.5 3.5l9.3 9.3M16.5 3.5l-9.3 9.3" />
      <path d="M12.8 12.8l2.8.9.9 2.8-1.2 1.2-2.8-.9-.9-2.8zM7.2 12.8l-2.8.9-.9 2.8 1.2 1.2 2.8-.9.9-2.8z" />
    </>
  ),
  canoe: (
    <>
      <path d="M2 13.5c3.2 1.8 12.8 1.8 16 0-3.2-1.2-12.8-1.2-16 0z" />
      <path d="M6 5.5l8 8" />
      <ellipse cx="5" cy="4.5" rx="1.2" ry="2.3" transform="rotate(-45 5 4.5)" />
      <ellipse cx="15" cy="14.5" rx="1.2" ry="2.3" transform="rotate(-45 15 14.5)" />
    </>
  ),
  surfing: (
    <>
      <path d="M4 15.5C4.5 9.5 8.5 4.5 15.5 3c-.5 6.5-4.5 11.5-11.5 12.5z" />
      <path d="M5.5 14l8.5-9.5" />
      <path d="M10.5 17c1.2-.9 2.3.9 3.5 0s2.3.9 3.5 0" />
    </>
  ),
  basketball: (
    <>
      <circle cx="10" cy="10" r="7" />
      <path d="M10 3v14M3 10h14M5.2 5c2.2 2.6 2.2 7.4 0 10M14.8 5c-2.2 2.6-2.2 7.4 0 10" />
    </>
  ),
};

// A tag: a sport not chosen or not known.
const UNKNOWN = (
  <>
    <path d="M3.5 4.5v5.2l7 7 6.2-6.2-7-7H4.5a1 1 0 0 0-1 1z" />
    <circle cx="7.2" cy="8" r="1.1" />
  </>
);

export const hasSportIcon = (sport: string) => sport in SPORT_PATHS;

export function SportIcon({ sport }: { sport: string | null }) {
  return (
    <svg className="icon sport-icon" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      {(sport && SPORT_PATHS[sport]) || UNKNOWN}
    </svg>
  );
}
