import { describe, expect, it } from 'vitest';
import { readFailure, readSearch, readVideos } from '../../src/shared/youtube-data';

describe('YouTube Data API responses', () => {
  it('reads search results', () => {
    const data = {
      items: [
        {
          id: { kind: 'youtube#video', videoId: 'M7lc1UVf-VE' },
          snippet: { title: 'Final', channelTitle: 'World Triathlon', liveBroadcastContent: 'live' },
        },
        { id: { kind: 'youtube#channel', channelId: 'UCXRVKD6l-LrX5TmGJqQFFoQ' }, snippet: {} },
      ],
    };
    expect(readSearch(data)).toEqual([
      { videoId: 'M7lc1UVf-VE', title: 'Final', channel: 'World Triathlon', live: 'live' },
    ]);
    expect(readSearch(null)).toEqual([]);
  });

  it('reads live state, schedule, embeddability and the channel', () => {
    const data = {
      items: [
        {
          id: 'M7lc1UVf-VE',
          snippet: {
            title: 'Soon',
            channelTitle: 'C',
            channelId: 'UCXRVKD6l-LrX5TmGJqQFFoQ',
            liveBroadcastContent: 'upcoming',
          },
          liveStreamingDetails: { scheduledStartTime: '2026-10-31T10:00:00Z' },
          status: { embeddable: false },
        },
      ],
    };
    expect(readVideos(data)).toEqual([
      {
        videoId: 'M7lc1UVf-VE',
        title: 'Soon',
        channel: 'C',
        live: 'upcoming',
        scheduledStart: '2026-10-31T10:00:00Z',
        embeddable: false,
        channelId: 'UCXRVKD6l-LrX5TmGJqQFFoQ',
      },
    ]);
  });

  it('tells quota, key and API problems apart', () => {
    const body = (reason: string, message = '') => ({ error: { message, errors: [{ reason }] } });
    expect(readFailure(403, body('quotaExceeded'))).toEqual({ reason: 'quota', quota: true });
    expect(readFailure(400, body('badRequest', 'API key not valid. Please pass a valid API key.'))).toEqual({
      reason: 'invalid-key',
      quota: false,
    });
    expect(readFailure(403, body('accessNotConfigured'))).toEqual({ reason: 'api-disabled', quota: false });
    expect(readFailure(500, null)).toEqual({ reason: 'error', quota: false });
  });
});
