import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import preact from '@astrojs/preact';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://askinglove.com',
  integrations: [preact(), sitemap()],
  vite: {
    plugins: [tailwindcss()],
  },
});
