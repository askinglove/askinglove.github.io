#!/usr/bin/env node
/**
 * Export YouTube captions (.srt / .vtt) from a 正文 markdown file.
 * Timings are evenly estimated from episode duration in the RSS feed
 * (good enough for first pass; refine in YouTube Studio if needed).
 *
 * Usage:
 *   npm run transcript:srt -- 2664929
 *   npm run transcript:srt -- 2664929 --vtt
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const rssId = process.argv[2];
const asVtt = process.argv.includes('--vtt');
if (!rssId || !/^\d+$/.test(rssId)) {
  console.error('Usage: npm run transcript:srt -- <rssId> [--vtt]');
  process.exit(1);
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const mdPath = join(root, 'src/data/transcripts', `${rssId}.md`);
if (!existsSync(mdPath)) {
  console.error(`Missing transcript: ${mdPath}`);
  console.error(`Create with: npm run transcript:new -- ${rssId}`);
  process.exit(1);
}

const raw = readFileSync(mdPath, 'utf8');
const body = raw.replace(/^---[\s\S]*?---\s*/, '').trim();
const plain = body
  .replace(/^#{1,6}\s+/gm, '')
  .replace(/\*\*([^*]+)\*\*/g, '$1')
  .replace(/\*([^*]+)\*/g, '$1')
  .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
  .replace(/^>\s?/gm, '')
  .replace(/^---$/gm, '')
  .replace(/\n{2,}/g, '\n')
  .trim();

const chunks = chunkText(plain, 36);
const durationSec = await fetchDurationSec(rssId);
const total = Math.max(durationSec || chunks.length * 3, chunks.length * 2.2);
const slice = total / chunks.length;

const cues = chunks.map((text, i) => {
  const start = i * slice;
  const end = Math.min(total, (i + 1) * slice);
  return { i: i + 1, start, end, text };
});

const outDir = join(root, 'exports', 'youtube');
mkdirSync(outDir, { recursive: true });

if (asVtt) {
  const vtt = ['WEBVTT', ''];
  for (const c of cues) {
    vtt.push(`${fmtVtt(c.start)} --> ${fmtVtt(c.end)}`);
    vtt.push(c.text);
    vtt.push('');
  }
  const file = join(outDir, `${rssId}.vtt`);
  writeFileSync(file, vtt.join('\n'), 'utf8');
  console.log(`Wrote ${file} (${cues.length} cues, ~${Math.round(total)}s)`);
} else {
  const srt = [];
  for (const c of cues) {
    srt.push(String(c.i));
    srt.push(`${fmtSrt(c.start)} --> ${fmtSrt(c.end)}`);
    srt.push(c.text);
    srt.push('');
  }
  const file = join(outDir, `${rssId}.srt`);
  writeFileSync(file, srt.join('\n'), 'utf8');
  console.log(`Wrote ${file} (${cues.length} cues, ~${Math.round(total)}s)`);
}
console.log('Upload in YouTube Studio → Subtitles → Upload file');
console.log('Description: npm run transcript:youtube --', rssId);

function chunkText(text, maxChars) {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  const parts = [];
  let buf = '';
  for (const ch of cleaned) {
    buf += ch;
    const hitPunct = /[。！？；!?;]/.test(ch);
    if (buf.length >= maxChars && hitPunct) {
      parts.push(buf.trim());
      buf = '';
    } else if (buf.length >= maxChars + 12) {
      parts.push(buf.trim());
      buf = '';
    }
  }
  if (buf.trim()) parts.push(buf.trim());
  return parts.filter(Boolean);
}

function fmtSrt(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  const ms = Math.floor((sec - Math.floor(sec)) * 1000);
  return `${p(h)}:${p(m)}:${p(s)},${String(ms).padStart(3, '0')}`;
}

function fmtVtt(sec) {
  return fmtSrt(sec).replace(',', '.');
}

function p(n) {
  return String(n).padStart(2, '0');
}

async function fetchDurationSec(id) {
  try {
    const res = await fetch('https://media.rss.com/askinglove/feed.xml', {
      headers: { Accept: 'application/rss+xml' },
    });
    const xml = await res.text();
    const re = new RegExp(
      `<item>[\\s\\S]*?/askinglove/${id}[\\s\\S]*?<itunes:duration>([^<]+)</itunes:duration>[\\s\\S]*?</item>`,
      'i',
    );
    // fallback: find item containing id then duration
    const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].map((m) => m[1]);
    for (const item of items) {
      if (!item.includes(`/askinglove/${id}`)) continue;
      const d = item.match(/<itunes:duration>([^<]+)<\/itunes:duration>/i);
      if (!d) return 0;
      const raw = d[1].trim();
      if (raw.includes(':')) {
        const parts = raw.split(':').map(Number);
        if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
        if (parts.length === 2) return parts[0] * 60 + parts[1];
      }
      const n = parseInt(raw, 10);
      return Number.isFinite(n) ? n : 0;
    }
  } catch {
    /* ignore */
  }
  return 0;
}
