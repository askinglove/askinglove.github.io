/**
 * Full reading 正文 (transcript body) for episodes.
 *
 * Source of truth files: src/data/transcripts/{rssId}.md
 * One 简体文稿 → site 正文页 + (ops) YouTube captions from the same text.
 */

import fs from 'node:fs';
import path from 'node:path';
import { toSimplified } from './zh';
import { show } from '../data/show';
import type { Episode } from './rss';
import { episodeHref } from './episodes';

const TRANSCRIPTS_DIR = path.join(process.cwd(), 'src/data/transcripts');

export type TranscriptDoc = {
  rssId: string;
  /** Markdown body without frontmatter */
  markdown: string;
  /** Plain text for word count / captions export */
  plainText: string;
  /** Approximate Chinese character count (excl. whitespace) */
  charCount: number;
  html: string;
  /** Optional note from frontmatter */
  source?: string;
  disclaimer: string;
};

const DEFAULT_DISCLAIMER =
  '文稿经整理，与音频可能略有出入；以表达清晰为准。';

/** Path helpers */
export function transcriptHref(episode: { slug: string }): string {
  return `/episodes/${episode.slug}/transcript`;
}

export function transcriptFilePath(rssId: string): string {
  return path.join(TRANSCRIPTS_DIR, `${rssId}.md`);
}

export function hasTranscriptFile(rssId: string): boolean {
  try {
    return fs.existsSync(transcriptFilePath(rssId));
  } catch {
    return false;
  }
}

/** Load and parse a transcript markdown file. Returns null if missing. */
export function loadTranscript(rssId: string): TranscriptDoc | null {
  const file = transcriptFilePath(rssId);
  if (!fs.existsSync(file)) return null;

  const raw = fs.readFileSync(file, 'utf8');
  const { meta, body } = parseFrontmatter(raw);
  const markdown = toSimplified(body.trim());
  if (!markdown) return null;

  const plainText = markdownToPlain(markdown);
  const charCount = countChars(plainText);
  const disclaimer = toSimplified(
    (meta.disclaimer as string) || DEFAULT_DISCLAIMER,
  );

  return {
    rssId,
    markdown,
    plainText,
    charCount,
    html: renderSimpleMarkdown(markdown),
    source: meta.source as string | undefined,
    disclaimer,
  };
}

/** True when a full 正文 is available for linking (readable length). */
export function hasFullTranscript(rssId: string): boolean {
  const doc = loadTranscript(rssId);
  // ~400 字 as minimum “worth a separate page”; aim 1200+ for publish.
  return !!doc && doc.charCount >= 400;
}

/**
 * YouTube description (short) — do NOT paste full 正文 here.
 * Hook + takeaways optional + link to site.
 */
export function buildYoutubeDescription(opts: {
  episode: Episode;
  takeaways?: string[];
  useTranscriptUrl?: boolean;
}): string {
  const { episode, takeaways = [], useTranscriptUrl = true } = opts;
  const epUrl = new URL(episodeHref(episode), show.url).href;
  const bodyUrl = hasFullTranscript(episode.rssId)
    ? new URL(transcriptHref(episode), show.url).href
    : epUrl;

  const lines: string[] = [
    episode.hook || episode.title,
    '',
  ];

  if (takeaways.length > 0) {
    takeaways.slice(0, 3).forEach((t, i) => {
      lines.push(`${i + 1}. ${t}`);
    });
    lines.push('');
  }

  lines.push(
    useTranscriptUrl && hasFullTranscript(episode.rssId)
      ? `阅读全文：${bodyUrl}`
      : `收听本集：${epUrl}`,
    `全部节目：${show.url}/episodes/`,
    `投稿你的故事：${show.url}/submit/`,
    `订阅更新：${show.substackUrl}`,
    '',
    `#问情播客 #AskingLove #情感 #关系`,
  );

  return lines.join('\n');
}

function parseFrontmatter(raw: string): { meta: Record<string, unknown>; body: string } {
  if (!raw.startsWith('---')) return { meta: {}, body: raw };
  const end = raw.indexOf('\n---', 3);
  if (end < 0) return { meta: {}, body: raw };
  const fm = raw.slice(3, end).trim();
  const body = raw.slice(end + 4).replace(/^\s*\n/, '');
  const meta: Record<string, unknown> = {};
  for (const line of fm.split('\n')) {
    const m = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!m) continue;
    let val: unknown = m[2].trim();
    if (val === 'true') val = true;
    else if (val === 'false') val = false;
    else if (
      typeof val === 'string' &&
      ((val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'")))
    ) {
      val = val.slice(1, -1);
    }
    meta[m[1]] = val;
  }
  return { meta, body };
}

function markdownToPlain(md: string): string {
  return md
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^>\s?/gm, '')
    .replace(/^---$/gm, '')
    .trim();
}

function countChars(text: string): number {
  return text.replace(/\s+/g, '').length;
}

/** Minimal safe markdown → HTML for 正文 pages. */
export function renderSimpleMarkdown(md: string): string {
  const blocks = md.split(/\n{2,}/);
  const html: string[] = [];

  for (const block of blocks) {
    const t = block.trim();
    if (!t) continue;
    if (/^---+$/.test(t)) {
      html.push('<hr />');
      continue;
    }
    if (t.startsWith('### ')) {
      html.push(`<h3>${inline(t.slice(4))}</h3>`);
      continue;
    }
    if (t.startsWith('## ')) {
      html.push(`<h2>${inline(t.slice(3))}</h2>`);
      continue;
    }
    if (t.startsWith('# ')) {
      html.push(`<h2>${inline(t.slice(2))}</h2>`);
      continue;
    }
    if (t.startsWith('> ')) {
      const q = t
        .split('\n')
        .map((l) => l.replace(/^>\s?/, ''))
        .join('<br />');
      html.push(`<blockquote><p>${inline(q)}</p></blockquote>`);
      continue;
    }
    if (/^[-*]\s/m.test(t)) {
      const items = t
        .split('\n')
        .filter((l) => /^[-*]\s/.test(l))
        .map((l) => `<li>${inline(l.replace(/^[-*]\s+/, ''))}</li>`)
        .join('');
      html.push(`<ul>${items}</ul>`);
      continue;
    }
    const para = t.split('\n').map(inline).join('<br />');
    html.push(`<p>${para}</p>`);
  }

  return html.join('\n');
}

function inline(s: string): string {
  return escapeHtml(s)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(
      /\[([^\]]+)\]\((https?:[^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
    );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
