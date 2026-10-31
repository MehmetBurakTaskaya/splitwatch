import { beforeEach, describe, expect, it } from 'vitest';
import { useSession } from '../../src/renderer/state/session';

const A = 'M7lc1UVf-VE';
const B = 'aqz-KE-bpKQ';
const C = 'dQw4w9WgXcQ';

describe('replacing an ended stream', () => {
  beforeEach(() => {
    useSession.setState({
      layout: '2',
      streams: [A, B],
      selected: B,
      volumes: { B: 1, [B]: 0.4 },
      sports: { [B]: 'swimming' },
      status: { [B]: { state: 'ended' } },
      waiting: [],
    });
  });

  it('keeps its place, volume and selection, and takes the new sport', () => {
    useSession.getState().replace(B, C, 'athletics');
    const s = useSession.getState();
    expect(s.streams).toEqual([A, C]);
    expect(s.selected).toBe(C);
    expect(s.volumes[C]).toBe(0.4);
    expect(s.volumes[B]).toBeUndefined();
    expect(s.sports).toEqual({ [C]: 'athletics' });
    expect(s.status[B]).toBeUndefined();
  });

  it('does nothing for a stream that is not in the grid, or a new one that already is', () => {
    useSession.getState().replace(C, A);
    useSession.getState().replace(B, A);
    expect(useSession.getState().streams).toEqual([A, B]);
  });
});
