# 06 — Roadmap

Sequenced so the site is deployable-green after every phase. Estimates assume one part-time developer; ranges are honest, not aspirational.

## Phase 0 — Stop the bleeding (hotfixes, ~1–2 days)

Ship nothing new. Make the existing product truthful.

| Fix | Where |
|---|---|
| Make shopping-list page actually run: drop `is:inline`, import the existing `.ts` utils as a bundled `<script>` (Astro processes them) or inline-compile; page renders real state | `shopping-list.astro` |
| Fix null-classifier crash in aggregation (pass a real classifier or make normalize standalone-pure) | `shopping-list-aggregator.ts` |
| Pass `cookwareList`/`timersList` to `getStepText`; add build assertion: every HowToStep text non-empty | `recipe-metadata.ts`, `[slug].astro` |
| try/catch + validate around `JSON.parse` of localStorage (list + theme) | `Layout.astro` |
| Escape/`textContent` recipe title/name/quantity in renderer | `shopping-list-renderer.ts` |
| Delete `public/scripts/*` (stale duplicates) | `public/scripts` |
| RSS: merge frontmatter, real `pubDate` (frontmatter `date`, else file mtime), sort desc | `rss.xml.ts` |

Exit criteria: shopping list add→aggregate→check-off works end-to-end on the built site; JSON-LD validated in Google's Rich Results test; no `public/scripts`; CI builds green.

## Phase 1 — Foundations (≈1 week)

- Content Collections: glob `recipes/**/*.cook`, zod schema (03 §3), slug normalization, build fails loudly on invalid frontmatter.
- `lib/` core: `cooklang.ts` wrapper (evaluate official `@cooklang/parser` vs `@tmlmt`), `quantities.ts` (single fraction/unit module), `taxonomy.ts`, `shopping.ts`, `grocery-sections.ts` (build-time classification), `url.ts`.
- Rewrite pages onto the core, one at a time: `index` → `recipes/[slug]` → `tags/*` → `rss.xml`. Delete superseded utils as their last caller goes (`parse-recipe.ts`, `recipe-metadata.ts` regex copy, `food-classifier.ts` runtime fetch, `unit-converter.ts`, `quantity-formatter.ts`).
- Client `store.ts` + rewrite shopping-list page on it (items model from 04 §4: check-off persistence, manual items, undo, export copy/CSV/JSON).
- SEO pack: sitemap, robots, 404, canonical/OG/Twitter, title suffix, fixed JSON-LD, theme boot in `<head>` (FOUC).
- Tooling: Vitest (+ unit tests for quantities/shopping/taxonomy/cooklang fixtures), `astro check` + Biome/ESLint/Prettier as `npm run check`, PR workflow (check+test+build at root & subpath base), Playwright smoke for the Phase-0 flows.

Exit criteria: no page reads recipes via `readdir`/`readFileSync`; `rg "formatQty|toNiceFraction" src` hits one module; corrupt localStorage can't break a page; coverage on `lib/` ≥ 85%; axe passes on all pages.

## Phase 2 — Redesign (≈1–2 weeks)

- Tokens + `ui/` components (Button, Chip, Card, Icon, Stepper, Dialog, Toast) + `Base.astro` header/footer/nav.
- Home: search-first (Pagefind), facets with counts, sort, persisted grid/list, designed placeholder images.
- Recipe page: sticky ingredient panel, stepper scaling, per-item list-add, live timer chips, collapsed source, print stylesheet.
- Images: `astro:assets` with local/`remotePatterns`, responsive + explicit dims; no-image placeholder design.
- A11y pass: landmarks, labels, focus rings, icon names, reduced motion; remove emoji chrome.
- PWA: runtime caching of visited recipes + assets (real offline reads), maskable icon, token-consistent `theme_color`.

Exit criteria: redesign covers 100% of routes; Lighthouse ≥95 mobile on home+recipe; print preview matches spec; e2e covers search→recipe→scale→print.

## Phase 3 — Signature features (≈1–2 weeks)

- **Cook mode** (`/recipes/[slug]/cook/`): stepper, live countdowns with alarm + vibration, wake lock, session persistence, offline.
- Shopping-list v2 polish: per-recipe expander, aisle overrides (remembered), share-via-URL, print list.
- Collections ("cookbooks") via `collections.yml` → static pages.
- Favorites + recently viewed (store-backed, surfaced on home).
- Measurement-system preference (US fractions ↔ metric) wired through `quantities.ts`.

Exit criteria: cook a recipe from a phone offline with a working timer; list survives reload/crash; a "Christmas baking" collection exists with zero code.

## Phase 4 — Force multipliers (backlog, unprioritized)

- `npm run import <url>` CLI (schema.org → `.cook`), incl. image download.
- Planner-lite week grid → list-from-plan.
- Authoring playground page (live Cooklang editor → preview).
- Recipe QR on print; OG image generation (satori) per recipe.
- i18n-ready string extraction; `@cooklang/parser` upstream contributions for anything the wrapper has to fight.
- Optional: Lighthouse CI + bundle budgets in CI.

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| Content Collections migration changes URLs | Slugs preserved from filenames when they're already URL-safe; add redirects for the rest (`astro.config` redirects map) |
| Parser swap breaks rendering | Wrapper + fixture snapshot tests before/after; keep `@tmlmt` until parity proven |
| Scope creep toward "Mealie clone" | 03 §6 list is the contract; every new feature must pass "does it need a server? no → maybe; yes → no" |
| Template-repo users have custom forks | Phases 0–1 are mechanical refactors with a `MIGRATING.md` per phase; tag releases per phase |
