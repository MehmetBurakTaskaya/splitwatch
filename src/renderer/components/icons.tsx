// Line icons on a 20 x 20 grid, drawn in the current text color. All are decorative: the button
// around each one carries the accessible name.
import type { ReactNode } from 'react';

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg className="icon" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      {children}
    </svg>
  );
}

export const IconPlay = () => (
  <Icon>
    <path d="M6 4.5v11l9-5.5z" className="fill" />
  </Icon>
);
export const IconPause = () => (
  <Icon>
    <path d="M6.5 4.5v11M13.5 4.5v11" />
  </Icon>
);
export const IconSound = () => (
  <Icon>
    <path d="M3.5 8v4h3l4 3.5v-11l-4 3.5z" className="fill" />
    <path d="M13.5 7.5a3.5 3.5 0 0 1 0 5M15.5 5.5a6.5 6.5 0 0 1 0 9" />
  </Icon>
);
export const IconMuted = () => (
  <Icon>
    <path d="M3.5 8v4h3l4 3.5v-11l-4 3.5z" className="fill" />
    <path d="M13.5 8l4 4M17.5 8l-4 4" />
  </Icon>
);
export const IconBack = () => (
  <Icon>
    <path d="M9 5.5L4.5 10 9 14.5M15.5 5.5L11 10l4.5 4.5" />
  </Icon>
);
export const IconForward = () => (
  <Icon>
    <path d="M11 5.5l4.5 4.5-4.5 4.5M4.5 5.5L9 10l-4.5 4.5" />
  </Icon>
);
export const IconEnlarge = () => (
  <Icon>
    <path d="M4 8V4h4M16 8V4h-4M4 12v4h4M16 12v4h-4" />
  </Icon>
);
export const IconRestore = () => (
  <Icon>
    <path d="M8 4v4H4M12 4v4h4M8 16v-4H4M12 16v-4h4" />
  </Icon>
);
export const IconClose = () => (
  <Icon>
    <path d="M5 5l10 10M15 5L5 15" />
  </Icon>
);
export const IconExternal = () => (
  <Icon>
    <path d="M11 4h5v5M16 4l-7 7M14 11.5V16H4V6h4.5" />
  </Icon>
);
export const IconGrip = () => (
  <Icon>
    <path d="M7.5 5v.01M12.5 5v.01M7.5 10v.01M12.5 10v.01M7.5 15v.01M12.5 15v.01" className="dots" />
  </Icon>
);
export const IconKeyboard = () => (
  <Icon>
    <rect x="2.5" y="5" width="15" height="10" rx="1.5" />
    <path d="M6 12.5h8M5.5 8h.01M8.5 8h.01M11.5 8h.01M14.5 8h.01" />
  </Icon>
);
export const IconSettings = () => (
  <Icon>
    <path d="M8.25 4.26L8.75 2.1H11.25L11.75 4.26L12.82 4.7L14.7 3.53L16.47 5.3L15.3 7.18L15.74 8.25L17.9 8.75V11.25L15.74 11.75L15.3 12.82L16.47 14.7L14.7 16.47L12.82 15.3L11.75 15.74L11.25 17.9H8.75L8.25 15.74L7.18 15.3L5.3 16.47L3.53 14.7L4.7 12.82L4.26 11.75L2.1 11.25V8.75L4.26 8.25L4.7 7.18L3.53 5.3L5.3 3.53L7.18 4.7Z" />
    <circle cx="10" cy="10" r="2.5" />
  </Icon>
);
// The sun shows on dark windows (it switches to light), the moon on light ones.
export const IconSun = () => (
  <Icon>
    <circle cx="10" cy="10" r="3" />
    <path d="M10 2.5v1.5M10 16v1.5M2.5 10H4M16 10h1.5M4.7 4.7l1.06 1.06M14.24 14.24l1.06 1.06M4.7 15.3l1.06-1.06M14.24 5.76l1.06-1.06" />
  </Icon>
);
export const IconMoon = () => (
  <Icon>
    <path d="M15.8 12.6A6.5 6.5 0 0 1 7.4 4.2a6.5 6.5 0 1 0 8.4 8.4z" />
  </Icon>
);
export const IconSearch = () => (
  <Icon>
    <circle cx="8.5" cy="8.5" r="5" />
    <path d="M12.5 12.5l4.5 4.5" />
  </Icon>
);
export const IconAdd = () => (
  <Icon>
    <path d="M10 4.5v11M4.5 10h11" />
  </Icon>
);

// Small pictures of each layout, for the layout buttons.
export function LayoutGlyph({ columns, rows, featured }: { columns: number; rows: number; featured?: boolean }) {
  const cells: ReactNode[] = [];
  if (featured) {
    cells.push(<rect key="big" x="2.5" y="4" width="10" height="12" rx="1" />);
    for (let r = 0; r < 3; r++) cells.push(<rect key={r} x="13.5" y={4 + r * 4.2} width="4" height="3.6" rx="0.6" />);
  } else {
    const w = (15 - (columns - 1)) / columns;
    const h = (12 - (rows - 1)) / rows;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < columns; c++) {
        cells.push(<rect key={`${r}-${c}`} x={2.5 + c * (w + 1)} y={4 + r * (h + 1)} width={w} height={h} rx="0.6" />);
      }
    }
  }
  return (
    <svg className="icon layout-glyph" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      {cells}
    </svg>
  );
}
