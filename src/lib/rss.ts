/**
 * Build-time RSS fetch + parse for AskingLove episodes.
 * No external XML libraries — small regex extractor for this feed's CDATA shape.
 */

import overridesJson from '../data/episode-overrides.json';
import { autoTag } from '../data/episode-tags';

export const RSS_FEED_URL = 'https://media.rss.com/askinglove/feed.xml';

export type Episode = {
  /** Primary content id / URL slug (RSS numeric id). */
  id: string;
  /** Primary URL segment (= rssId). */
  slug: string;
  rssId: string;
  title: string;
  /** One-paragraph plain-text hook for hero / cards (≤ ~180 chars ideal). */
  hook: string;
  /** Alias of hook for data-model clarity / cards. */
  summary: string;
  /** Original cleaned description HTML (optional display). */
  descriptionHtml: string;
  /** Plain description for SEO / search. */
  descriptionText: string;
  /** Override transcript (markdown/plain); empty if none. */
  transcript: string;
  /** Cleaned show notes (plain text) when no transcript. */
  showNotes: string;
  pubDate: Date;
  /** Formatted mm:ss from itunes:duration seconds. */
  duration: string;
  /** Duration in seconds when parseable. */
  durationSec: number;
  /** ISO 8601 duration e.g. PT10M50S for JSON-LD. */
  durationIso: string;
  episodeNumber?: number;
  season?: number;
  audioUrl?: string;
  audioType: string;
  coverImage?: string;
  rssEmbedUrl: string;
  rssPageUrl: string;
  tags: string[];
  featured: boolean;
  draft: boolean;
  /** Extra URL slugs that redirect to this episode (e.g. dark-crush). */
  aliases: string[];
};

export type EpisodeOverride = {
  slug?: string;
  tags?: string[];
  featured?: boolean;
  draft?: boolean;
  hook?: string;
  transcript?: string;
  title?: string;
};

type OverridesMap = Record<string, EpisodeOverride>;

const overrides = overridesJson as OverridesMap;

const BOILERPLATE_RE =
  /^(🎧|官网|投稿|订阅|这里聊爱情|不评判|不说教|记住，爱是需要|每期\d|「Asking Love|AskingLove)/;

let cache: Episode[] | null = null;

/** Fetch RSS feed, parse items, merge overrides. Cached per build process. */
export async function getAllEpisodes(): Promise<Episode[]> {
  if (cache) return cache;
  const xml = await fetchFeedXml();
  const rawItems = extractItems(xml);
  if (rawItems.length === 0) {
    throw new Error(
      `[rss] Parsed 0 <item> entries from ${RSS_FEED_URL}. Feed shape may have changed.`,
    );
  }
  cache = rawItems.map(parseItem).filter((ep): ep is Episode => ep !== null);
  return cache;
}

/** Published (non-draft) episodes, newest first. */
export async function getPublishedEpisodes(): Promise<Episode[]> {
  const all = await getAllEpisodes();
  return all
    .filter((ep) => !ep.draft)
    .sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime());
}

async function fetchFeedXml(): Promise<string> {
  let res: Response;
  try {
    res = await fetch(RSS_FEED_URL, {
      headers: { Accept: 'application/rss+xml, application/xml, text/xml, */*' },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(
      `[rss] Failed to fetch ${RSS_FEED_URL}: ${msg}. Network is required at build time.`,
    );
  }
  if (!res.ok) {
    throw new Error(
      `[rss] Feed fetch returned HTTP ${res.status} ${res.statusText} for ${RSS_FEED_URL}`,
    );
  }
  return res.text();
}

function extractItems(xml: string): string[] {
  const items: string[] = [];
  const re = /<item>([\s\S]*?)<\/item>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    items.push(m[1]);
  }
  return items;
}

function parseItem(itemXml: string): Episode | null {
  const title = decodeXml(extractTag(itemXml, 'title') || extractTag(itemXml, 'itunes:title') || '');
  const link = (extractTag(itemXml, 'link') || '').trim();
  const rssId = extractRssId(link, itemXml);
  if (!rssId) {
    console.warn(`[rss] Skipping item without RSS id: ${title.slice(0, 40)}`);
    return null;
  }

  const descriptionHtmlRaw = extractTag(itemXml, 'description') || '';
  const durationSeconds = extractTag(itemXml, 'itunes:duration') || '';
  const episodeNumberRaw = extractTag(itemXml, 'itunes:episode') || extractTag(itemXml, 'podcast:episode');
  const seasonRaw = extractTag(itemXml, 'itunes:season') || extractTag(itemXml, 'podcast:season');
  const pubDateRaw = extractTag(itemXml, 'pubDate') || '';
  const enclosureUrl = extractAttr(itemXml, 'enclosure', 'url');
  const coverImage =
    extractAttr(itemXml, 'itunes:image', 'href') ||
    extractNestedTag(itemXml, 'image', 'url') ||
    undefined;

  const ov = overrides[rssId] ?? {};
  const paragraphs = extractParagraphs(descriptionHtmlRaw);
  const usefulParagraphs = paragraphs.filter((p) => !isBoilerplate(p));
  const descriptionText = usefulParagraphs.join('\n\n').trim() || stripHtml(descriptionHtmlRaw).trim();
  const hookFromFeed = (usefulParagraphs[0] || descriptionText).slice(0, 180);
  const showNotes = descriptionText;
  const hook = (ov.hook?.trim() || hookFromFeed).trim();
  const tags =
    ov.tags && ov.tags.length > 0
      ? ov.tags.slice(0, 4)
      : autoTag(`${title} ${hook} ${descriptionText.slice(0, 400)}`, 4);

  const episodeNumber = episodeNumberRaw ? parseInt(episodeNumberRaw, 10) : undefined;
  const season = seasonRaw ? parseInt(seasonRaw, 10) : undefined;
  const pubDate = pubDateRaw ? new Date(pubDateRaw) : new Date(0);
  const durationSec = parseDurationToSeconds(durationSeconds);
  const duration = formatDurationSeconds(durationSeconds);
  const audioType = extractAttr(itemXml, 'enclosure', 'type') || 'audio/mpeg';

  const aliases: string[] = [];
  if (ov.slug && ov.slug !== rssId) {
    aliases.push(ov.slug);
  }

  // Skip items with no playable audio
  if (!enclosureUrl) {
    console.warn(`[rss] Skipping item without enclosure audio: ${title.slice(0, 40)}`);
    return null;
  }

  return {
    id: rssId,
    slug: rssId,
    rssId,
    title: ov.title?.trim() || title,
    hook,
    summary: hook,
    descriptionHtml: usefulParagraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join(''),
    descriptionText,
    transcript: ov.transcript?.trim() || '',
    showNotes,
    pubDate: Number.isNaN(pubDate.getTime()) ? new Date(0) : pubDate,
    duration,
    durationSec,
    durationIso: secondsToIso8601(durationSec),
    episodeNumber: Number.isFinite(episodeNumber) ? episodeNumber : undefined,
    season: Number.isFinite(season) ? season : undefined,
    audioUrl: enclosureUrl,
    audioType,
    coverImage,
    rssEmbedUrl: `https://player.rss.com/askinglove/${rssId}`,
    rssPageUrl: `https://rss.com/podcasts/askinglove/${rssId}`,
    tags,
    featured: ov.featured === true,
    draft: ov.draft === true,
    aliases,
  };
}

function extractRssId(link: string, itemXml: string): string | null {
  const fromLink = link.match(/\/askinglove\/(\d+)\/?/);
  if (fromLink) return fromLink[1];
  const fromEnclosure = itemXml.match(/\/askinglove\/[^"'<\s]*?\/(\d{5,})\//);
  if (fromEnclosure) return fromEnclosure[1];
  const fromPlayer = itemXml.match(/player\.rss\.com\/askinglove\/(\d+)/);
  if (fromPlayer) return fromPlayer[1];
  return null;
}

/** Extract text content of first matching tag (CDATA or plain). */
function extractTag(xml: string, tag: string): string | null {
  // Escape for regex; require end of tag name so "itunes:episode" ≠ "itunes:episodeType"
  const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const open = `<${escaped}(?=[\\s>/])`;
  const close = `</${escaped}>`;

  const cdata = new RegExp(
    `${open}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*${close}`,
    'i',
  );
  const cdataMatch = xml.match(cdata);
  if (cdataMatch) return cdataMatch[1];

  const plain = new RegExp(`${open}[^>]*>([\\s\\S]*?)${close}`, 'i');
  const plainMatch = xml.match(plain);
  if (plainMatch) return plainMatch[1].trim();
  return null;
}

function extractNestedTag(xml: string, parent: string, child: string): string | null {
  const block = xml.match(new RegExp(`<${parent}>([\\s\\S]*?)</${parent}>`, 'i'));
  if (!block) return null;
  return extractTag(block[1], child);
}

function extractAttr(xml: string, tag: string, attr: string): string | undefined {
  const escaped = tag.replace(':', '\\:');
  const re = new RegExp(`<${escaped}\\b([^>]*)\\/?>`, 'i');
  const m = xml.match(re);
  if (!m) return undefined;
  const attrRe = new RegExp(`${attr}\\s*=\\s*["']([^"']+)["']`, 'i');
  const am = m[1].match(attrRe);
  return am?.[1];
}

function extractParagraphs(html: string): string[] {
  const paras: string[] = [];
  const re = /<p\b[^>]*>([\s\S]*?)<\/p>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const text = stripHtml(m[1]).trim();
    if (text) paras.push(text);
  }
  if (paras.length === 0) {
    const stripped = stripHtml(html).trim();
    if (stripped) paras.push(stripped);
  }
  return paras;
}

function isBoilerplate(text: string): boolean {
  const t = text.trim();
  if (!t) return true;
  if (BOILERPLATE_RE.test(t)) return true;
  if (/^问情播客/.test(t) && t.length < 40) return true;
  if (/askinglove\.com/i.test(t) && t.length < 80) return true;
  if (/askinglovepod\.substack/i.test(t)) return true;
  if (/投稿你的故事/.test(t) && t.length < 60) return true;
  if (/订阅更新/.test(t) && t.length < 60) return true;
  return false;
}

function stripHtml(html: string): string {
  return decodeXml(
    html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/\s+\n/g, '\n')
      .replace(/\n\s+/g, '\n')
      .replace(/[ \t]{2,}/g, ' ')
      .trim(),
  );
}

function decodeXml(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&amp;/g, '&')
    .replace(/\u00a0/g, ' ')
    .trim();
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function parseDurationToSeconds(raw: string | number): number {
  if (typeof raw === 'number') {
    return Number.isFinite(raw) && raw >= 0 ? Math.floor(raw) : 0;
  }
  const t = String(raw || '').trim();
  if (!t) return 0;
  if (t.includes(':')) {
    const parts = t.split(':').map((p) => parseInt(p, 10));
    if (parts.some((n) => !Number.isFinite(n))) return 0;
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return 0;
  }
  const seconds = parseInt(t, 10);
  return Number.isFinite(seconds) && seconds >= 0 ? seconds : 0;
}

export function formatDurationSeconds(raw: string | number): string {
  if (typeof raw === 'string' && raw.includes(':')) {
    return raw.trim();
  }
  const seconds = parseDurationToSeconds(raw);
  if (!seconds) return '';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/** Convert seconds to ISO 8601 duration for schema.org (e.g. PT10M50S). */
export function secondsToIso8601(totalSec: number): string {
  if (!Number.isFinite(totalSec) || totalSec <= 0) return '';
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = Math.floor(totalSec % 60);
  let out = 'PT';
  if (h > 0) out += `${h}H`;
  if (m > 0 || h > 0) out += `${m}M`;
  out += `${s}S`;
  return out;
}
