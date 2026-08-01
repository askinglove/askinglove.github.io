/**
 * Keyword → display tag for auto-tagging episodes from title + hook.
 * First match order wins; max tags applied by the tagger.
 */
export const TAG_KEYWORDS: { tag: string; keywords: string[] }[] = [
  { tag: '暗恋', keywords: ['暗恋', '单相思', '偷偷喜欢', '不敢说'] },
  { tag: '分手', keywords: ['分手', '复合', '分手后', '断联', '复合吗'] },
  { tag: '出轨', keywords: ['出轨', '背叛', '小三', '劈腿', '隐瞒', '大床房'] },
  { tag: '婚姻', keywords: ['婚姻', '结婚', '婚后', '夫妻', '做月子', '老公', '老婆'] },
  { tag: '冷战', keywords: ['冷战', '石墙', '沉默', '不说话', '冷暴力'] },
  { tag: '原生家庭', keywords: ['原生家庭', '妈妈', '爸爸', '父母', '家暴', '童年'] },
  { tag: '异地', keywords: ['异地', '异地恋', '远距离'] },
  { tag: '妥协', keywords: ['妥协', '付出', '牺牲', '沉没成本', '迁就'] },
  { tag: '信任', keywords: ['信任', '怀疑', '查手机', '查电脑', '安全感', '猜疑'] },
  { tag: '自我', keywords: ['自我', '边界', '自我价值', '讨好', '看清自己'] },
  { tag: '控制', keywords: ['控制', 'PUA', '训练你', '权力', '操控'] },
  { tag: '放下', keywords: ['放下', '放不下', '走出来', '释怀', '结束'] },
  { tag: '暧昧', keywords: ['暧昧', '不确定', '说不清', '拉扯'] },
  { tag: '恋爱', keywords: ['恋爱', '喜欢', '心动', '告白', '在一起'] },
];

/** Match title+hook against keyword map; return up to max tags. */
export function autoTag(text: string, max = 3): string[] {
  const hay = text.toLowerCase();
  const tags: string[] = [];
  for (const { tag, keywords } of TAG_KEYWORDS) {
    if (tags.includes(tag)) continue;
    if (keywords.some((kw) => hay.includes(kw.toLowerCase()))) {
      tags.push(tag);
      if (tags.length >= max) break;
    }
  }
  return tags;
}
