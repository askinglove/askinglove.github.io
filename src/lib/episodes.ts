/**
 * Episode helpers: related episodes, path building, formatting.
 */

import type { Episode } from './rss';
import { getPublishedEpisodes } from './rss';

export { autoTag } from '../data/episode-tags';

/** Related episodes: shared tags first, fill with nearest episodeNumber / recent. Cap at 3. */
export function getRelatedEpisodes(
  episode: Episode,
  all: Episode[],
  limit = 3,
): Episode[] {
  const others = all.filter((ep) => ep.rssId !== episode.rssId && !ep.draft);
  const picked: Episode[] = [];
  const seen = new Set<string>();

  const take = (ep: Episode) => {
    if (seen.has(ep.rssId) || picked.length >= limit) return;
    seen.add(ep.rssId);
    picked.push(ep);
  };

  if (episode.tags.length > 0) {
    const scored = others
      .map((ep) => {
        const shared = ep.tags.filter((t) => episode.tags.includes(t)).length;
        return { ep, shared };
      })
      .filter((x) => x.shared > 0)
      .sort((a, b) => {
        if (b.shared !== a.shared) return b.shared - a.shared;
        return b.ep.pubDate.getTime() - a.ep.pubDate.getTime();
      });
    for (const { ep } of scored) take(ep);
  }

  if (picked.length < limit && episode.episodeNumber != null) {
    const byProximity = others
      .filter((ep) => ep.episodeNumber != null)
      .map((ep) => ({
        ep,
        dist: Math.abs((ep.episodeNumber as number) - (episode.episodeNumber as number)),
      }))
      .sort((a, b) => a.dist - b.dist || b.ep.pubDate.getTime() - a.ep.pubDate.getTime());
    for (const { ep } of byProximity) take(ep);
  }

  if (picked.length < limit) {
    const recent = others
      .slice()
      .sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime());
    for (const ep of recent) take(ep);
  }

  return picked;
}

/** Static paths for primary slug + aliases. */
export async function getEpisodeStaticPaths() {
  const episodes = await getPublishedEpisodes();
  const paths: { params: { slug: string }; props: { episode: Episode } }[] = [];

  for (const episode of episodes) {
    paths.push({
      params: { slug: episode.slug },
      props: { episode },
    });
    for (const alias of episode.aliases) {
      paths.push({
        params: { slug: alias },
        props: { episode },
      });
    }
  }

  return paths;
}

export function formatEpisodeDate(date: Date | string): string {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(d);
}

/** Rehydrate Episode after Astro getStaticPaths JSON serialization (Date → string). */
export function rehydrateEpisode(raw: Episode): Episode {
  return {
    ...raw,
    pubDate: raw.pubDate instanceof Date ? raw.pubDate : new Date(raw.pubDate as unknown as string),
  };
}

export function episodeHref(episode: Episode): string {
  return `/episodes/${episode.slug}`;
}
