#!/usr/bin/env node
/**
 * Print a short YouTube description for an episode (not the full 正文).
 * Usage: npm run transcript:youtube -- 2664929
 */
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const rssId = process.argv[2];
if (!rssId || !/^\d+$/.test(rssId)) {
  console.error('Usage: npm run transcript:youtube -- <rssId>');
  process.exit(1);
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://askinglove.com';
const epUrl = `${SITE}/episodes/${rssId}/`;
const txUrl = `${SITE}/episodes/${rssId}/transcript/`;
const hasTx = existsSync(join(root, 'src/data/transcripts', `${rssId}.md`));

// Prefer hook from built-time data if available; else fetch feed title/desc
let title = '';
let hook = '';
try {
  const res = await fetch('https://media.rss.com/askinglove/feed.xml');
  const xml = await res.text();
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].map((m) => m[1]);
  for (const item of items) {
    if (!item.includes(`/askinglove/${rssId}`)) continue;
    const t = item.match(/<title(?:[^>]*)><!\[CDATA\[(.*?)\]\]>|<title(?:[^>]*)>([^<]+)/i);
    title = (t?.[1] || t?.[2] || '').trim();
    const d = item.match(
      /<description(?:[^>]*)><!\[CDATA\[([\s\S]*?)\]\]>|<description(?:[^>]*)>([\s\S]*?)<\/description>/i,
    );
    const html = d?.[1] || d?.[2] || '';
    const paras = [...html.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)]
      .map((m) => m[1].replace(/<[^>]+>/g, '').trim())
      .filter(Boolean);
    hook = paras[0] || title;
    break;
  }
} catch {
  /* ignore */
}

const lines = [
  hook || title || `问情播客 · 第 ${rssId} 集`,
  '',
  hasTx ? `阅读全文：${txUrl}` : `收听本集：${epUrl}`,
  `节目页（含播放）：${epUrl}`,
  `全部节目：${SITE}/episodes/`,
  `投稿你的故事：${SITE}/submit/`,
  `订阅更新：https://askinglovepod.substack.com`,
  '',
  '#问情播客 #AskingLove #情感 #关系 #播客',
];

console.log(lines.join('\n'));
