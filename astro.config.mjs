import { defineConfig } from "astro/config";

export default defineConfig({
  // For GitHub Pages deployment
  site: "https://zarguell.github.io",
  base: "/recipes-as-code", // Only if deploying to a project repo, remove for user/org pages

  output: "static",
  outDir: "./dist",
  trailingSlash: 'always',
});
