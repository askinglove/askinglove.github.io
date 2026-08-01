/**
 * Per-episode Spotify / Apple Podcasts deep links.
 * Mapping lives in src/data/episode-store-links.json (regenerate via npm run sync:store-links).
 */

import storeLinksJson from '../data/episode-store-links.json';
import { platforms } from '../data/platforms';

export type StoreLinkEntry = {
  title?: string;
  appleUrl?: string;
  appleEpisodeId?: string;
  spotifyUrl?: string;
  spotifyEpisodeId?: string;
};

const storeLinks = storeLinksJson as Record<string, StoreLinkEntry>;

export function getStoreLinks(rssId: string): StoreLinkEntry {
  return storeLinks[rssId] ?? {};
}

export type EpisodePlatformLink = {
  name: string;
  url: string;
  label: string;
  /** True when this is a per-episode deep link (not just the show page). */
  deep: boolean;
};

/**
 * Platform buttons for an episode page.
 * Spotify / Apple use deep links when known; otherwise fall back to show URLs.
 */
export function getEpisodePlatformLinks(opts: {
  rssId: string;
  rssPageUrl: string;
}): EpisodePlatformLink[] {
  const stores = getStoreLinks(opts.rssId);
  const showSpotify = platforms.find((p) => p.icon === 'spotify')?.url;
  const showApple = platforms.find((p) => p.icon === 'apple')?.url;
  const showYoutube = platforms.find((p) => p.icon === 'youtube')?.url;
  const showRss = platforms.find((p) => p.icon === 'rss')?.url;

  const links: EpisodePlatformLink[] = [];

  if (stores.spotifyUrl || showSpotify) {
    const deep = !!stores.spotifyUrl;
    links.push({
      name: 'Spotify',
      url: stores.spotifyUrl || showSpotify!,
      label: deep ? '在 Spotify 打开本集' : '在 Spotify 收听',
      deep,
    });
  }

  if (stores.appleUrl || showApple) {
    const deep = !!stores.appleUrl;
    links.push({
      name: 'Apple Podcasts',
      url: stores.appleUrl || showApple!,
      label: deep ? '在 Apple Podcasts 打开本集' : '在 Apple Podcasts 收听',
      deep,
    });
  }

  if (showYoutube) {
    links.push({
      name: 'YouTube',
      url: showYoutube,
      label: '在 YouTube 收听',
      deep: false,
    });
  }

  // Always include this episode on RSS.com when we have an id.
  links.push({
    name: 'RSS.com',
    url: opts.rssPageUrl || showRss || 'https://rss.com/podcasts/askinglove/',
    label: '在 RSS.com 打开本集',
    deep: true,
  });

  return links;
}
