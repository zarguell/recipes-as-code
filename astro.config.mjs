import { defineConfig } from 'astro/config';
import VitePWA from '@vite-pwa/astro';

export default defineConfig({
  site: 'https://zarguell.github.io',
  base: '/recipes-as-code',
  output: 'static',
  outDir: './dist',
  build: {
    format: 'directory'
  },
  trailingSlash: 'always',
  integrations: [
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json}']
      },
      manifest: {
        name: 'Recipe Site',
        short_name: 'Recipes',
        description: 'A beautiful static recipe site built with Astro and CookLang',
        theme_color: '#ff6b35',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/recipes-as-code/',
        scope: '/recipes-as-code/',
        icons: [
            { src: 'icons/192x192.png', sizes: '192x192', type: 'image/png' },
            { src: 'icons/512x512.png', sizes: '512x512', type: 'image/png' },
        ]
      }
    })
  ]
});
