#!/usr/bin/env node
/**
 * Scaffold a 正文 markdown file for an episode.
 * Usage: npm run transcript:new -- 2664929
 */
import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const rssId = process.argv[2];
if (!rssId || !/^\d+$/.test(rssId)) {
  console.error('Usage: npm run transcript:new -- <rssId>');
  process.exit(1);
}

const dir = join(dirname(fileURLToPath(import.meta.url)), '../src/data/transcripts');
mkdirSync(dir, { recursive: true });
const file = join(dir, `${rssId}.md`);

if (existsSync(file)) {
  console.error(`Already exists: ${file}`);
  process.exit(1);
}

const template = `---
source: final-script
disclaimer: 文稿经整理，与音频可能略有出入；以表达清晰为准。
---

## 开场

（点题。1–2 段。）

## 故事

（完整叙事。阅读版可稍顺句，与口播尽量一致。）

## 我们看见了什么

（1 个概念或 2–3 个带走的点，用白话写清。）

## 想一想

（一个开放式问题，不说教。）

## 结尾

爱是需要学习的能力。你愿意听完 / 读完这一篇，就已经迈出了重要的一步。

投稿：https://askinglove.com/submit/
`;

writeFileSync(file, template, 'utf8');
console.log(`Created ${file}`);
console.log(`After writing 1200+ 字, deploy → /episodes/${rssId}/transcript/`);
