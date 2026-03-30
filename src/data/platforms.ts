export interface Platform {
  name: string;
  url: string;
  icon: string;
}

export const platforms: Platform[] = [
  {
    name: 'Spotify',
    url: 'https://open.spotify.com/show/5KUQ6iyXZbZqQBLyvWHdoF',
    icon: 'spotify',
  },
  {
    name: 'RSS.com',
    url: 'https://rss.com/podcasts/askinglove/',
    icon: 'rss',
  },
];

export const socialLinks = [
  {
    name: 'X (Twitter)',
    url: 'https://x.com/askinglovepod',
    icon: 'x',
  },
  {
    name: 'Instagram',
    url: 'https://www.instagram.com/askinglovepod',
    icon: 'instagram',
  },
  {
    name: 'Threads',
    url: 'https://www.threads.com/@askinglovepod',
    icon: 'threads',
  },
];
