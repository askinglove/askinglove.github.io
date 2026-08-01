import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import preact from '@astrojs/preact';
import sitemap from '@astrojs/sitemap';

// Pretty aliases → canonical RSS id slugs (static redirects on GitHub Pages).
// Primary catalog URLs remain /episodes/{rssId}/.
const episodeRedirects = {
  '/episodes/dark-crush': '/episodes/2664929',
};

export default defineConfig({
  site: 'https://askinglove.com',
  integrations: [preact(), sitemap()],
  redirects: {
    ...episodeRedirects,
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
