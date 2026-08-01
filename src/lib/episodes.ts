/**
 * Episode helpers: related episodes, path building, formatting.
 */

import type { Episode } from './rss';
import { getPublishedEpisodes } from './rss';
import { START_HERE_IDS } from '../data/start-here';

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

/**
 * Static paths for primary (numeric) slugs only.
 * Pretty aliases (e.g. dark-crush) use Astro redirects → canonical slug.
 */
export async function getEpisodeStaticPaths() {
  const episodes = await getPublishedEpisodes();
  return episodes.map((episode) => ({
    params: { slug: episode.slug },
    props: { episode },
  }));
}

/** Build redirect map from alias → canonical episode path. */
export async function getEpisodeAliasRedirects(): Promise<Record<string, string>> {
  const episodes = await getPublishedEpisodes();
  const map: Record<string, string> = {};
  for (const ep of episodes) {
    for (const alias of ep.aliases) {
      map[`/episodes/${alias}`] = `/episodes/${ep.slug}`;
    }
  }
  return map;
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

export function episodeHref(episode: Episode | { slug: string }): string {
  return `/episodes/${episode.slug}`;
}

/** Latest published episode by pubDate. */
export function getLatestEpisode(all: Episode[]): Episode | undefined {
  return all.slice().sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime())[0];
}

/** Resolve Start Here pack, preserving config order; skip missing ids.
 * Always return an even count for the 2-column homepage grid. */
export function getStartHereEpisodes(all: Episode[]): Episode[] {
  const byId = new Map(all.map((ep) => [ep.rssId, ep]));
  const list = START_HERE_IDS.map((id) => byId.get(id)).filter((ep): ep is Episode => !!ep);
  if (list.length % 2 === 1) list.pop();
  return list;
}

/** Count episodes per tag. */
export function getTagCounts(all: Episode[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const ep of all) {
    for (const tag of ep.tags) {
      counts.set(tag, (counts.get(tag) || 0) + 1);
    }
  }
  return counts;
}

/** Union of all tags sorted by frequency then name. */
export function getAllTags(all: Episode[]): string[] {
  return [...getTagCounts(all).entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh-CN'))
    .map(([tag]) => tag);
}

/** Canonical path for a tag collection page. */
export function tagHref(tag: string): string {
  return `/tags/${encodeURIComponent(tag)}`;
}

/** True if at least one *other* published episode also uses this tag. */
export function tagHasOtherEpisodes(
  tag: string,
  episodeRssId: string,
  all: Episode[],
): boolean {
  return all.some((ep) => ep.rssId !== episodeRssId && ep.tags.includes(tag));
}

/** Episodes that carry a given tag, newest first. */
export function getEpisodesByTag(all: Episode[], tag: string): Episode[] {
  return all
    .filter((ep) => ep.tags.includes(tag))
    .sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime());
}

/** Static paths for every tag that appears on at least one episode. */
export async function getTagStaticPaths() {
  const all = await getPublishedEpisodes();
  const tags = getAllTags(all);
  return tags.map((tag) => ({
    params: { tag },
    props: {
      tag,
      episodes: getEpisodesByTag(all, tag),
    },
  }));
}

/** JSON-serializable card fields for client islands. */
export type EpisodeCardData = {
  slug: string;
  title: string;
  summary: string;
  duration: string;
  episodeNumber?: number;
  pubDateLabel: string;
  pubDateIso: string;
  tags: string[];
  coverImage?: string;
  href: string;
};

export function toEpisodeCardData(ep: Episode): EpisodeCardData {
  return {
    slug: ep.slug,
    title: ep.title,
    summary: ep.summary || ep.hook,
    duration: ep.duration,
    episodeNumber: ep.episodeNumber,
    pubDateLabel: formatEpisodeDate(ep.pubDate),
    pubDateIso: ep.pubDate.toISOString(),
    tags: ep.tags,
    coverImage: ep.coverImage,
    href: episodeHref(ep),
  };
}
