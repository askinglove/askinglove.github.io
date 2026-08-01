/**
 * Normalize Chinese text to 简体中文 for site UI and show notes.
 * Feed copy sometimes mixes 繁体 forms (隱瞞、願意、該…).
 */

import * as OpenCC from 'opencc-js';

/** Taiwan traditional → mainland simplified. */
const t2s = OpenCC.Converter({ from: 'tw', to: 'cn' });

/** Convert any mixed 繁/简 string to simplified. Safe for empty / non-Chinese. */
export function toSimplified(text: string | null | undefined): string {
  if (!text) return '';
  return t2s(text);
}
