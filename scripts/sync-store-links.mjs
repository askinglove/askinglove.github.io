#!/usr/bin/env node
/**
 * Sync per-episode Spotify + Apple Podcasts deep links into
 * src/data/episode-store-links.json
 *
 * Apple: public iTunes Lookup API (no key).
 * Spotify: prefers SPOTIFY_CLIENT_ID + SPOTIFY_CLIENT_SECRET (client credentials);
 *          falls back to embed page token + search matching.
 *
 * Usage: npm run sync:store-links
 */

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '../src/data/episode-store-links.json');

const APPLE_PODCAST_ID = '1886972295';
const SPOTIFY_SHOW_ID = '5KUQ6iyXZbZqQBLyvWHdoF';
const RSS_FEED = 'https://media.rss.com/askinglove/feed.xml';

function norm(s) {
  return String(s || '')
    .replace(/\u3000/g, ' ')
    .trim()
    .replace(/\s+/g, '')
    .replace(/[“”"']/g, '')
    .toLowerCase();
}

async function fetchJson(url, headers = {}) {
  const res = await fetch(url, {
    headers: { Accept: 'application/json', 'User-Agent': 'AskingLoveSite/1.0', ...headers },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status} ${url} ${body.slice(0, 120)}`);
  }
  return res.json();
}

async function fetchText(url, headers = {}) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 AskingLoveSite/1.0', ...headers },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return res.text();
}

async function loadRssEpisodes() {
  const xml = await fetchText(RSS_FEED);
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].map((m) => m[1]);
  const out = [];
  for (const item of items) {
    const titleM = item.match(/<title(?:[^>]*)><!\[CDATA\[(.*?)\]\]>|<title(?:[^>]*)>([^<]+)/i);
    const title = (titleM?.[1] || titleM?.[2] || '').trim();
    const idM = item.match(/\/askinglove\/(\d+)/);
    const rssId = idM?.[1];
    if (rssId && title) out.push({ rssId, title });
  }
  return out;
}

async function loadAppleByTitle() {
  const data = await fetchJson(
    `https://itunes.apple.com/lookup?id=${APPLE_PODCAST_ID}&entity=podcastEpisode&limit=200`,
  );
  const map = new Map();
  for (const r of data.results || []) {
    if (r.wrapperType !== 'podcastEpisode') continue;
    map.set(norm(r.trackName), r);
  }
  return map;
}

async function spotifyToken() {
  const id = process.env.SPOTIFY_CLIENT_ID;
  const secret = process.env.SPOTIFY_CLIENT_SECRET;
  if (id && secret) {
    const basic = Buffer.from(`${id}:${secret}`).toString('base64');
    const res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });
    if (!res.ok) throw new Error(`Spotify client credentials failed: ${res.status}`);
    const d = await res.json();
    console.log('[spotify] using client credentials');
    return d.access_token;
  }

  // Fallback: anonymous embed token (rate-limited; best-effort)
  const html = await fetchText(`https://open.spotify.com/embed/show/${SPOTIFY_SHOW_ID}`);
  const m = html.match(/"accessToken":"([^"]+)"/);
  if (!m) throw new Error('No Spotify token (set SPOTIFY_CLIENT_ID/SECRET or try again)');
  console.log('[spotify] using embed anonymous token');
  return m[1];
}

async function loadSpotifyByTitle(token) {
  const map = new Map();
  // Prefer full show listing
  let url = `https://api.spotify.com/v1/shows/${SPOTIFY_SHOW_ID}/episodes?market=US&limit=50`;
  try {
    while (url) {
      const d = await fetchJson(url, { Authorization: `Bearer ${token}` });
      for (const ep of d.items || []) {
        if (ep?.name) map.set(norm(ep.name), ep);
      }
      url = d.next;
      if (url) await sleep(300);
    }
    if (map.size > 0) {
      console.log(`[spotify] listed ${map.size} episodes from show`);
      return map;
    }
  } catch (e) {
    console.warn('[spotify] show listing failed, will search per title:', e.message);
  }
  return map;
}

async function searchSpotifyEpisode(token, title) {
  const q = encodeURIComponent(`${title} 问情`);
  const d = await fetchJson(
    `https://api.spotify.com/v1/search?q=${q}&type=episode&limit=10&market=US`,
    { Authorization: `Bearer ${token}` },
  );
  const eps = d.episodes?.items || [];
  const nt = norm(title);
  for (const ep of eps) {
    if (ep && norm(ep.name) === nt) {
      if (!ep.show || ep.show.id === SPOTIFY_SHOW_ID) return ep;
    }
  }
  for (const ep of eps) {
    if (ep?.show?.id === SPOTIFY_SHOW_ID) return ep;
  }
  return null;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const rss = await loadRssEpisodes();
  console.log(`[rss] ${rss.length} episodes`);

  const appleByTitle = await loadAppleByTitle();
  console.log(`[apple] ${appleByTitle.size} episodes`);

  let token = null;
  let spotifyByTitle = new Map();
  try {
    token = await spotifyToken();
    spotifyByTitle = await loadSpotifyByTitle(token);
  } catch (e) {
    console.warn('[spotify] token/list failed:', e.message);
  }

  const out = {};
  let appleHits = 0;
  let spotifyHits = 0;

  for (const { rssId, title } of rss) {
    const n = norm(title);
    const entry = { title };

    const a = appleByTitle.get(n);
    if (a) {
      entry.appleEpisodeId = String(a.trackId);
      entry.appleUrl = `https://podcasts.apple.com/podcast/id${APPLE_PODCAST_ID}?i=${a.trackId}`;
      appleHits++;
    }

    let s = spotifyByTitle.get(n);
    if (!s && token) {
      try {
        s = await searchSpotifyEpisode(token, title);
        await sleep(700);
      } catch (e) {
        console.warn(`[spotify] search fail for ${title}:`, e.message);
        await sleep(2000);
      }
    }
    if (s) {
      entry.spotifyEpisodeId = s.id;
      entry.spotifyUrl = s.external_urls?.spotify || `https://open.spotify.com/episode/${s.id}`;
      spotifyHits++;
    }

    out[rssId] = entry;
  }

  writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n', 'utf8');
  console.log(`[done] wrote ${OUT}`);
  console.log(`  apple deep links: ${appleHits}/${rss.length}`);
  console.log(`  spotify deep links: ${spotifyHits}/${rss.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
