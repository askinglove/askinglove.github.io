/**
 * Structured show notes for each episode.
 * Prefer truthful content from the feed over invented “三点”.
 */

import type { Episode } from './rss';
import { episodeHref } from './episodes';
import {
  CONCEPTS,
  DEFAULT_REFLECTION,
  REFLECTION_BY_TAG,
  type Concept,
} from '../data/concepts';
import { show } from '../data/show';

export type ShowNotes = {
  /** One strong hook line (title or override). */
  hook: string;
  /** 2–4 sentence story setup from description (cleaned). */
  setup: string;
  /** Up to 3 short takeaways; may be empty if only a concept is shown. */
  takeaways: string[];
  /** Optional named concept with plain-language blurb. */
  concept: { name: string; blurb: string } | null;
  /** One reflection question. */
  reflection: string;
  /** Absolute URL of this episode page. */
  episodeUrl: string;
  submitUrl: string;
  showUrl: string;
  /** Plain text block for copy/share (WeChat, notes apps, etc.). */
  shareText: string;
  showShareText: string;
};

export type ShowNotesOverride = {
  hook?: string;
  setup?: string;
  takeaways?: string[];
  concept?: string;
  reflection?: string;
};

/** Build structured notes from episode + optional override fields. */
export function buildShowNotes(
  episode: Episode,
  related: Episode[],
  override?: ShowNotesOverride,
): ShowNotes {
  const hook = (override?.hook?.trim() || episode.title).trim();
  const setup =
    override?.setup?.trim() ||
    buildSetup(episode.descriptionText || episode.showNotes || episode.hook);

  const detected = detectConcepts(`${episode.title}\n${episode.hook}\n${episode.descriptionText}`);
  const conceptName = override?.concept?.trim();
  let concept: ShowNotes['concept'] = null;
  if (conceptName) {
    const known = CONCEPTS.find((c) => c.name === conceptName);
    concept = {
      name: conceptName,
      blurb: known?.blurb || '',
    };
  } else if (detected[0]) {
    concept = { name: detected[0].name, blurb: detected[0].blurb };
  }

  let takeaways = (override?.takeaways || []).map((t) => t.trim()).filter(Boolean).slice(0, 3);
  if (takeaways.length === 0) {
    takeaways = buildTakeaways(episode, detected);
  }

  const reflection =
    override?.reflection?.trim() ||
    pickReflection(episode.tags) ||
    DEFAULT_REFLECTION;

  const episodeUrl = new URL(episodeHref(episode), show.url).href;
  const submitUrl = new URL('/submit', show.url).href;
  const showUrl = show.url;

  const shareText = formatEpisodeShareText({
    episode,
    hook,
    setup,
    takeaways,
    concept,
    reflection,
    episodeUrl,
    submitUrl,
    related,
  });

  const showShareText = [
    `${show.name}`,
    show.description,
    '',
    `收听与了解：${showUrl}`,
    `投稿你的故事：${submitUrl}`,
    `订阅更新：${show.substackUrl}`,
  ].join('\n');

  return {
    hook,
    setup,
    takeaways,
    concept,
    reflection,
    episodeUrl,
    submitUrl,
    showUrl,
    shareText,
    showShareText,
  };
}

function buildSetup(raw: string): string {
  const cleaned = stripBoilerplate(raw);
  if (!cleaned) return '';

  // Split into sentences (Chinese + Western punctuation).
  const parts = cleaned
    .split(/(?<=[。！？!?])\s*/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (parts.length === 0) return cleaned.slice(0, 280);

  // Prefer 2–4 sentences; if only one long block, keep it capped.
  const picked = parts.slice(0, 4);
  let out = picked.join('');
  if (parts.length === 1 && out.length > 320) {
    out = out.slice(0, 300).replace(/[，、\s]+$/, '') + '…';
  }
  return out;
}

function stripBoilerplate(text: string): string {
  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => {
      if (!line) return false;
      if (/^🎧/.test(line)) return false;
      if (/问情播客\s*AskingLove/.test(line) && line.length < 40) return false;
      if (/这里聊爱情/.test(line)) return false;
      if (/不评判/.test(line) && /不说教/.test(line)) return false;
      if (/官网\s*[:：]/.test(line) || /askinglove\.com/.test(line)) return false;
      if (/投稿/.test(line) && line.length < 80) return false;
      if (/订阅/.test(line) && line.length < 80) return false;
      if (/substack/i.test(line)) return false;
      if (/记住，爱是需要/.test(line)) return false;
      return true;
    })
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
}

function detectConcepts(text: string): Concept[] {
  const found: Concept[] = [];
  for (const c of CONCEPTS) {
    if (c.keywords.some((kw) => text.includes(kw))) {
      found.push(c);
    }
  }
  return found;
}

/**
 * Takeaways: honest framing from detected concepts + tags.
 * Avoid inventing episode-specific “三点” not supported by the feed.
 */
function buildTakeaways(episode: Episode, concepts: Concept[]): string[] {
  const out: string[] = [];

  for (const c of concepts.slice(0, 2)) {
    if (c.blurb) out.push(c.blurb);
  }

  // Tag-based soft frames (only if we still need more)
  const tagFrames: Record<string, string> = {
    暗恋: '有时候，暗恋维持的是想象，而不是两个人真实的相遇。',
    分手: '结束一段关系，不等于否定你曾经认真爱过。',
    出轨: '你的难受值得被认真对待，不需要先证明“够不够严重”。',
    婚姻: '亲密关系里，两套家庭剧本撞在一起时，先被挤压的往往是你。',
    冷战: '沟通需要两个人在场；一个人的解释填不满沉默。',
    原生家庭: '看见旧模式，是重新选择的开始，不是责备从前的自己。',
    妥协: '爱可以协商，但不该是只有一方不断搬空自己的人生。',
    信任: '怀疑出现时，先问感受是否被接住，而不是先责备自己敏感。',
    自我: '把自己放回决定的中心，不是自私，是成年。',
    控制: '被爱的感觉，不该以失去判断力为代价。',
    放下: '放下不是立刻不难过，而是停止用折磨自己来证明在乎。',
    恋爱: '被喜欢与被尊重，最好同时存在。',
  };

  for (const tag of episode.tags) {
    if (out.length >= 3) break;
    const frame = tagFrames[tag];
    if (frame && !out.includes(frame)) out.push(frame);
  }

  if (out.length === 0) {
    out.push('你的感受可以被慢慢说清楚，不需要一次就得到标准答案。');
    out.push('问情不评判对错，只陪你把乱成一团的情绪理清一点。');
  }

  return out.slice(0, 3);
}

function pickReflection(tags: string[]): string {
  for (const tag of tags) {
    if (REFLECTION_BY_TAG[tag]) return REFLECTION_BY_TAG[tag];
  }
  return DEFAULT_REFLECTION;
}

function formatEpisodeShareText(opts: {
  episode: Episode;
  hook: string;
  setup: string;
  takeaways: string[];
  concept: ShowNotes['concept'];
  reflection: string;
  episodeUrl: string;
  submitUrl: string;
  related: Episode[];
}): string {
  const {
    episode,
    hook,
    setup,
    takeaways,
    concept,
    reflection,
    episodeUrl,
    submitUrl,
    related,
  } = opts;

  const lines: string[] = [
    `【问情播客】${hook}`,
    episode.episodeNumber != null ? `第 ${episode.episodeNumber} 集` : '',
    '',
    '这一集在说什么',
    setup,
  ].filter(Boolean) as string[];

  if (concept) {
    lines.push('', `关键概念：${concept.name}`);
    if (concept.blurb) lines.push(concept.blurb);
  }

  if (takeaways.length > 0) {
    lines.push('', '你可以带走的');
    takeaways.forEach((t, i) => lines.push(`${i + 1}. ${t}`));
  }

  lines.push('', '想一想', reflection, '', `收听本集：${episodeUrl}`, `投稿故事：${submitUrl}`);

  if (related.length > 0) {
    lines.push('', '相关节目');
    for (const rel of related.slice(0, 2)) {
      lines.push(`· ${rel.title} ${new URL(episodeHref(rel), show.url).href}`);
    }
  }

  lines.push('', `更多节目：${show.url}`, `订阅更新：${show.substackUrl}`);

  return lines.join('\n');
}
