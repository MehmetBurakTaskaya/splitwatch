import { MIX, type ReadyCandidate, type ReadyKind, type ReadyList, mixList, readyList } from '../shared/ready-lists';
import { loadKey } from './key-store';
import { channelFeed, factsFor } from './live';
import { getPresets } from './presets-store';

// Ready lists from the preset channels (ADR 0014). The channels' feeds (free) give each channel's
// newest videos; with a key, one videos.list call per 50 of them (1 unit) tells which are live and
// which cannot play in an embedded player. Without a key the list holds the newest videos.

// The mix looks at fewer videos per channel, since it takes one stream per sport.
const MIX_PER_CHANNEL = 5;

export async function readyListFor(sport: string, kind: ReadyKind): Promise<ReadyList> {
  const presets = getPresets().filter((p) => sport === MIX || p.sport === sport);
  const bySport = new Map<string, ReadyCandidate[]>();
  await Promise.all(
    presets.map(async (preset) => {
      const feeds = await Promise.all(preset.channels.map((c) => channelFeed(c.id)));
      const entries = feeds.flatMap((list) => {
        const wide = list.filter((e) => !e.short);
        return sport === MIX ? wide.slice(0, MIX_PER_CHANNEL) : wide;
      });
      const candidates = entries.map((e): ReadyCandidate => ({
        videoId: e.videoId,
        title: e.title,
        channel: e.channel,
        live: 'unknown',
        sport: preset.sport,
        published: e.published,
      }));
      bySport.set(preset.sport, [...(bySport.get(preset.sport) ?? []), ...candidates]);
    }),
  );

  const ids = [...new Set([...bySport.values()].flat().map((c) => c.videoId))];
  const known = ids.length && (await loadKey()) ? await factsFor(ids) : null;
  if (known) {
    for (const [name, candidates] of bySport) {
      bySport.set(
        name,
        candidates.flatMap((c) => {
          const f = known.get(c.videoId);
          if (!f || !f.embeddable) return [];
          return [{ ...c, live: f.live, title: f.title || c.title, channel: f.channel || c.channel }];
        }),
      );
    }
  }
  const liveKnown = !!known;
  if (kind === 'live' && !liveKnown) return { layout: null, items: [], spare: [], liveKnown };
  return sport === MIX ? mixList(bySport, kind, liveKnown) : readyList(bySport.get(sport) ?? [], kind, liveKnown);
}
