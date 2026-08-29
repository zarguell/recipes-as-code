import { defineConfig } from 'astro/config';
import VitePWA from '@vite-pwa/astro';
import sitemap from '@astrojs/sitemap';

// This site deploys to GitHub Pages as a project site:
//   https://zarguell.github.io/recipes-as-code
const SITE = process.env.PUBLIC_SITE || 'https://zarguell.github.io';
const BASE_RAW = (process.env.PUBLIC_BASE ?? '/recipes-as-code').trim();

// Normalize so Astro gets either "" (root) or "/something" (no trailing slash).
const BASE =
  BASE_RAW === '' || BASE_RAW === '/'
    ? ''
    : `/${BASE_RAW.replace(/^\/+/, '').replace(/\/+$/, '')}`;

// For PWA manifest, start_url and scope should match the deployment subpath.
const BASE_WITH_TRAILING = BASE ? `${BASE}/` : '/';

export default defineConfig({
  site: SITE,
  base: BASE,
  output: 'static',
  outDir: './dist',
  build: { format: 'directory' },
  trailingSlash: 'always',
  integrations: [
    sitemap(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json,webmanifest}'],
        // Offline reads: visited recipe pages + images are cached at runtime.
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'pages',
              networkTimeoutSeconds: 3,
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'images',
              expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
      manifest: {
        name: process.env.PUBLIC_APP_NAME ?? 'Recipes',
        short_name: process.env.PUBLIC_APP_SHORT_NAME ?? 'Recipes',
        description:
          process.env.PUBLIC_APP_DESCRIPTION ??
          'A cookbook generated from Cooklang recipe files',
        theme_color: process.env.PUBLIC_THEME_COLOR ?? '#E58325',
        background_color: process.env.PUBLIC_BG_COLOR ?? '#faf9f7',
        display: 'standalone',
        start_url: BASE_WITH_TRAILING,
        scope: BASE_WITH_TRAILING,
        icons: [
          { src: 'icons/192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: 'icons/maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
});
