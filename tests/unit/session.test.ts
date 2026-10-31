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

describe('delays that line up the streams', () => {
  beforeEach(() => {
    useSession.setState({ streams: ['M7lc1UVf-VE', 'aqz-KE-bpKQ'], selected: 'M7lc1UVf-VE', popped: [], delays: {} });
  });

  it('are set per stream, and none is no entry', () => {
    useSession.getState().setDelay('aqz-KE-bpKQ', 7);
    expect(useSession.getState().delays).toEqual({ 'aqz-KE-bpKQ': 7 });
    useSession.getState().setDelay('aqz-KE-bpKQ', 0);
    expect(useSession.getState().delays).toEqual({});
  });

  it('go with their stream when it is removed, replaced or popped out', () => {
    const s = () => useSession.getState();
    s().setDelay('aqz-KE-bpKQ', 7);
    s().remove('aqz-KE-bpKQ');
    expect(s().delays).toEqual({});

    s().add('aqz-KE-bpKQ');
    s().setDelay('aqz-KE-bpKQ', 7);
    s().replace('aqz-KE-bpKQ', 'dQw4w9WgXcQ');
    expect(s().delays).toEqual({});

    s().setDelay('M7lc1UVf-VE', 3);
    s().popOut('M7lc1UVf-VE');
    expect(s().delays).toEqual({});
  });

  it('stay for the streams that a saved layout keeps', () => {
    useSession.getState().setDelay('M7lc1UVf-VE', 4);
    useSession.getState().setDelay('aqz-KE-bpKQ', 9);
    useSession
      .getState()
      .open({ layout: '2', streams: ['M7lc1UVf-VE', 'dQw4w9WgXcQ'], selected: null, volumes: {}, sports: {} });
    expect(useSession.getState().delays).toEqual({ 'M7lc1UVf-VE': 4 });
  });
});
