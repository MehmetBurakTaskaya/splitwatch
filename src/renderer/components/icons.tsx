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
    <circle cx="10" cy="10" r="2.5" />
    <path d="M10 2.5v2.5M10 15v2.5M2.5 10H5M15 10h2.5M4.7 4.7l1.8 1.8M13.5 13.5l1.8 1.8M4.7 15.3l1.8-1.8M13.5 6.5l1.8-1.8" />
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
