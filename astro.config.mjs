import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://zarguell.github.io',
  base: '/recipes-as-code',
  output: 'static',
  outDir: './dist',
  build: {
    format: 'directory'  
  },
  trailingSlash: 'always'  
});
