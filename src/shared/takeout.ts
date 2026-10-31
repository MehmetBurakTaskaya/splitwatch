// The YouTube subscriptions in a Google Takeout export (subscriptions.csv): one channel per row, as
// channel ID, channel URL and channel title, after a header row. The header's words follow the
// account's language, so the columns are found by what they hold: the cell that is a channel ID, and
// the first other cell that is not a link as the name.
import { isChannelId } from './feeds';
import type { FollowedChannel } from './notify';

// Far more than anyone subscribes to; a larger file is not a subscriptions list.
export const MAX_SUBSCRIPTIONS = 5000;

// RFC 4180: fields split by commas, rows by line breaks; a quoted field may hold both, and "" in it
// stands for one quote.
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') {
        quoted = false;
      } else {
        field += c;
      }
    } else if (c === '"' && field === '') {
      quoted = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += c;
    }
  }
  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

// The channels in the file, each once, or null when it holds none.
export function parseSubscriptions(text: string): FollowedChannel[] | null {
  const channels: FollowedChannel[] = [];
  for (const cells of parseCsv(text.replace(/^\uFEFF/, ''))) {
    const trimmed = cells.map((c) => c.trim());
    const id = trimmed.find(isChannelId);
    if (!id || channels.some((c) => c.id === id)) continue;
    const name = trimmed.find((c) => c && c !== id && !/^https?:\/\//i.test(c));
    channels.push({ id, name: (name ?? id).replace(/[\s\p{Cc}]+/gu, ' ').slice(0, 100) });
    if (channels.length === MAX_SUBSCRIPTIONS) break;
  }
  return channels.length ? channels : null;
}
