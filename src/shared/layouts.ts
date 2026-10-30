// Grid layouts. "featured" is one large stream with a strip of up to three on the inline-end side.

export type LayoutId = '1' | '2' | '3' | '4' | '6' | '9' | 'featured';

export interface Layout {
  id: LayoutId;
  capacity: number;
  columns: number;
  rows: number;
}

export const LAYOUTS: readonly Layout[] = [
  { id: '1', capacity: 1, columns: 1, rows: 1 },
  { id: '2', capacity: 2, columns: 2, rows: 1 },
  { id: '3', capacity: 3, columns: 3, rows: 1 },
  { id: '4', capacity: 4, columns: 2, rows: 2 },
  { id: '6', capacity: 6, columns: 3, rows: 2 },
  { id: '9', capacity: 9, columns: 3, rows: 3 },
  { id: 'featured', capacity: 4, columns: 2, rows: 3 },
];

export const MAX_STREAMS = 9;

export function layoutById(id: LayoutId): Layout {
  return LAYOUTS.find((l) => l.id === id) ?? LAYOUTS[0]!;
}

export function isLayoutId(value: unknown): value is LayoutId {
  return LAYOUTS.some((l) => l.id === value);
}

// The smallest regular grid that holds count streams.
export function layoutFor(count: number): LayoutId {
  return (LAYOUTS.find((l) => l.id !== 'featured' && l.capacity >= count) ?? LAYOUTS[5]!).id;
}

// The layouts that can show all of count streams, in menu order.
export function layoutsFor(count: number): LayoutId[] {
  return LAYOUTS.filter((l) => l.capacity >= Math.max(count, 1)).map((l) => l.id);
}

export function nextLayout(current: LayoutId, count: number): LayoutId {
  const options = layoutsFor(count);
  const i = options.indexOf(current);
  return options[(i + 1) % options.length]!;
}

// YouTube's embedded player must be at least 200 x 200 px. Each tile adds one bar under the player.
export const PLAYER_MIN = 200;
export const TILE_BAR = 36;
export const GRID_GAP = 4;
export const GRID_PADDING = 4;
export const TOP_BAR = 48;
const TILE_BORDER = 2;

// The main window's smallest outer size, enough for the top bar on one line.
export const WINDOW_MIN = { width: 720, height: 520 };

// Mini mode shows one tile: its smallest content keeps the player at 200 x 200 or more, and it
// opens with a 480 x 270 player.
export const MINI_MIN = { width: 380, height: 250 };
export const MINI_DEFAULT = {
  width: 480 + TILE_BORDER + 2 * GRID_PADDING,
  height: 270 + TILE_BAR + TILE_BORDER + 2 * GRID_PADDING,
};

export function minContentSize(id: LayoutId): { width: number; height: number } {
  const { columns, rows } = layoutById(id);
  const tileWidth = PLAYER_MIN + TILE_BORDER;
  const tileHeight = PLAYER_MIN + TILE_BAR + TILE_BORDER;
  return {
    width: columns * tileWidth + (columns - 1) * GRID_GAP + 2 * GRID_PADDING,
    height: TOP_BAR + rows * tileHeight + (rows - 1) * GRID_GAP + 2 * GRID_PADDING,
  };
}
