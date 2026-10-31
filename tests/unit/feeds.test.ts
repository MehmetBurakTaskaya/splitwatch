import { describe, expect, it } from 'vitest';
import { feedUrl, isChannelId, parseFeed } from '../../src/shared/feeds';

const FEED = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns="http://www.w3.org/2005/Atom">
 <title>World Triathlon</title>
 <entry>
  <id>yt:video:M7lc1UVf-VE</id>
  <yt:videoId>M7lc1UVf-VE</yt:videoId>
  <yt:channelId>UCXRVKD6l-LrX5TmGJqQFFoQ</yt:channelId>
  <title>Elite Women &amp; Men | Live &#8211; Finals</title>
  <author><name>World Triathlon</name><uri>https://www.youtube.com/channel/UCXRVKD6l-LrX5TmGJqQFFoQ</uri></author>
  <link rel="alternate" href="https://www.youtube.com/watch?v=M7lc1UVf-VE"/>
  <published>2026-10-30T15:00:08+00:00</published>
 </entry>
 <entry>
  <yt:videoId>aqz-KE-bpKQ</yt:videoId>
  <yt:channelId>UCXRVKD6l-LrX5TmGJqQFFoQ</yt:channelId>
  <title>Behind the start line #shorts</title>
  <link rel="alternate" href="https://www.youtube.com/shorts/aqz-KE-bpKQ"/>
  <author><name>World Triathlon</name></author>
  <published>2026-10-30T16:00:00+00:00</published>
 </entry>
 <entry>
  <yt:videoId>bad</yt:videoId>
  <yt:channelId>UCXRVKD6l-LrX5TmGJqQFFoQ</yt:channelId>
  <title>Skipped</title>
 </entry>
</feed>`;

describe('channel feeds', () => {
  it('reads valid entries, decodes entities and tells Shorts apart', () => {
    expect(parseFeed(FEED)).toEqual([
      {
        videoId: 'M7lc1UVf-VE',
        channelId: 'UCXRVKD6l-LrX5TmGJqQFFoQ',
        title: 'Elite Women & Men | Live – Finals',
        channel: 'World Triathlon',
        published: '2026-10-30T15:00:08+00:00',
        short: false,
      },
      {
        videoId: 'aqz-KE-bpKQ',
        channelId: 'UCXRVKD6l-LrX5TmGJqQFFoQ',
        title: 'Behind the start line #shorts',
        channel: 'World Triathlon',
        published: '2026-10-30T16:00:00+00:00',
        short: true,
      },
    ]);
  });

  it('survives junk', () => {
    expect(parseFeed('')).toEqual([]);
    expect(parseFeed('<html>error</html>')).toEqual([]);
  });

  it('knows channel IDs and builds feed URLs', () => {
    expect(isChannelId('UCXRVKD6l-LrX5TmGJqQFFoQ')).toBe(true);
    expect(isChannelId('@WorldTriathlon')).toBe(false);
    expect(feedUrl('UCXRVKD6l-LrX5TmGJqQFFoQ')).toBe(
      'https://www.youtube.com/feeds/videos.xml?channel_id=UCXRVKD6l-LrX5TmGJqQFFoQ',
    );
  });
});
