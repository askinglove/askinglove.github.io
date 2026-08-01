#!/usr/bin/env node
/**
 * Hash the public RSS catalog so CI can skip rebuilds when nothing changed.
 * Prints a single sha256 hex line to stdout.
 */
import { createHash } from 'node:crypto';

const FEED = 'https://media.rss.com/askinglove/feed.xml';

const res = await fetch(FEED, {
  headers: { Accept: 'application/rss+xml, application/xml, text/xml, */*' },
});
if (!res.ok) {
  console.error(`[feed-fingerprint] HTTP ${res.status} for ${FEED}`);
  process.exit(1);
}
const xml = await res.text();
const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].map((m) => m[1]);

const rows = items.map((item) => {
  const id = item.match(/\/askinglove\/(\d+)/)?.[1] || '';
  const title =
    item.match(/<title(?:[^>]*)><!\[CDATA\[(.*?)\]\]>|<title(?:[^>]*)>([^<]*)/i)?.[1] ||
    item.match(/<title(?:[^>]*)><!\[CDATA\[(.*?)\]\]>|<title(?:[^>]*)>([^<]*)/i)?.[2] ||
    '';
  const pub = item.match(/<pubDate>([^<]*)/i)?.[1] || '';
  const duration = item.match(/<itunes:duration>([^<]*)/i)?.[1] || '';
  const enclosure = item.match(/enclosure[^>]*url="([^"]+)"/i)?.[1] || '';
  return [id, title.trim(), pub.trim(), duration.trim(), enclosure.trim()].join('\t');
});

// Stable order
rows.sort();
const hash = createHash('sha256').update(rows.join('\n')).digest('hex');

// Optional debug to stderr
console.error(`[feed-fingerprint] ${items.length} items → ${hash.slice(0, 12)}…`);
process.stdout.write(hash);
