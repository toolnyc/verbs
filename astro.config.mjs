// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import vercel from '@astrojs/vercel';

export default defineConfig({
  output: 'server',
  adapter: vercel(),
  experimental: {
    fonts: [
      {
        provider: fontProviders.adobe({ id: 'dxj3lbp' }),
        name: 'Neue Haas Grotesk Display',
        cssVariable: '--font-sans',
        weights: [400, 500, 700],
        styles: ['normal', 'italic'],
        fallbacks: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
    ],
  },
});
