/**
 * JSON-LD builders for PodcastSeries / PodcastEpisode.
 */

import type { Episode } from './rss';
import { show } from '../data/show';
import { platforms } from '../data/platforms';
import { episodeHref } from './episodes';

export function podcastSeriesJsonLd(episodeCount?: number) {
  return {
    '@context': 'https://schema.org',
    '@type': 'PodcastSeries',
    name: show.name,
    description: show.description,
    url: show.url,
    image: show.coverUrl,
    webFeed: show.feedUrl,
    inLanguage: show.language,
    author: {
      '@type': 'Person',
      name: show.host,
      jobTitle: show.hostTitle,
    },
    publisher: {
      '@type': 'Organization',
      name: show.nameShort,
      url: show.url,
    },
    ...(typeof episodeCount === 'number' ? { numberOfEpisodes: episodeCount } : {}),
    sameAs: platforms.map((p) => p.url),
  };
}

export function podcastEpisodeJsonLd(episode: Episode) {
  const url = new URL(episodeHref(episode), show.url).href;
  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'PodcastEpisode',
    name: episode.title,
    description: episode.summary || episode.hook,
    url,
    datePublished: episode.pubDate.toISOString(),
    image: episode.coverImage || show.coverUrl,
    inLanguage: show.language,
    isPartOf: {
      '@type': 'PodcastSeries',
      name: show.name,
      url: show.url,
      webFeed: show.feedUrl,
    },
    author: {
      '@type': 'Person',
      name: show.host,
    },
  };

  if (episode.durationIso) data.duration = episode.durationIso;
  if (episode.episodeNumber != null) data.episodeNumber = episode.episodeNumber;
  if (episode.season != null) data.partOfSeason = {
    '@type': 'PodcastSeason',
    seasonNumber: episode.season,
  };

  if (episode.audioUrl) {
    data.associatedMedia = {
      '@type': 'AudioObject',
      contentUrl: episode.audioUrl,
      encodingFormat: episode.audioType || 'audio/mpeg',
      ...(episode.durationIso ? { duration: episode.durationIso } : {}),
    };
  }

  return data;
}
