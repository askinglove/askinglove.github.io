export const navLinks = [
  { label: '首页', href: '/' },
  { label: '全部节目', href: '/episodes' },
  { label: '收听', href: '/listen' },
  { label: '关于', href: '/about' },
];

export const navCta = {
  label: '投稿你的故事',
  href: '/submit',
};

/** True when the link represents the current section. */
export function isNavActive(href: string, pathname: string): boolean {
  const path = pathname.replace(/\/$/, '') || '/';
  const target = href.replace(/\/$/, '') || '/';
  if (target === '/') return path === '/';
  return path === target || path.startsWith(`${target}/`);
}
