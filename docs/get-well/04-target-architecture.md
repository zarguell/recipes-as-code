# 04 — Target Architecture

Principles: **one pipeline per concern**, **build-time over runtime whenever possible**, **typed at the boundaries**, **test the pure core**, **no global window state**. Astro stays; `output: 'static'` stays; the template-repo deployment model stays.

---

## 1. Target layout

```
src/
  content/                     # Astro Content Collections
    config.ts                  # glob loader over recipes/**/*.cook + zod schema
  lib/                         # framework-free core (unit-testable, no Astro imports)
    cooklang.ts                # parser wrapper → normalized typed Recipe
    quantities.ts              # ONE fraction/decimal/unit module (build+client)
    taxonomy.ts                # tag/category slugify, indexes, counts
    shopping.ts                # pure aggregation: canonicalize → merge → format
    grocery-sections.ts        # build-time classification data + matcher
    schema.ts                  # zod frontmatter schema + error formatting
    url.ts                     # url() helper (BASE_URL joining in one place)
  lib/client/                  # browser-only modules (imported by <script>)
    store.ts                   # typed localStorage store w/ pub/sub, safe parse
    shopping-list.ts           # store-backed list: items, recipes, undo, export
    cook-session.ts            # per-recipe step state, timers, wake lock
    prefs.ts                   # theme, view mode, measurement system
    share.ts                   # list→URL, list→text/CSV export
  components/
    ui/                        # Button, Chip, Card, IconButton, Dialog, Stepper…
    recipe/                    # RecipeCard, IngredientPanel, StepList, CookMode, TimerChip…
  layouts/
    Base.astro                 # <head>, SEO, theme boot, nav/footer slots
    Recipe.astro               # recipe page shell
  pages/
    index.astro
    recipes/[slug].astro
    recipes/[slug]/cook.astro  # cook mode (static page, client-activated)
    collections/[collection].astro
    tags/[tag].astro  tags/index.astro
    shopping-list.astro
    planner.astro              # Tier 2
    404.astro
    rss.xml.ts
styles/
  tokens.css  base.css  components.css   # design tokens + layers
recipes/                        # content (author-owned)
tests/  (unit)  e2e/  (playwright)
```

## 2. Content pipeline (replaces all 4 loading paths)

**Astro Content Collections + glob loader + zod.**

- Loader: `glob({ pattern: '**/*.cook', base: './recipes' })` — fixes recursive discovery (audit §2).
- `schema.ts`: zod schema from 03 §3. Unknown-key warnings; type errors fail the build with file+path. `slug` is generated (ascii-normalized, collision-checked) instead of raw filename — no more unicode/space URLs.
- Parse once: `getCollection('recipes')` → `lib/cooklang.ts` wraps the parser (evaluate `@cooklang/parser` official vs `@tmlmt`; the wrapper is where parser quirks like timer-range encodings die) → normalized type:

```ts
interface Recipe {
  slug: string; title: string; description?: string; image?: Image;
  tags: Tag[]; category?: Tag; servings?: number;
  times: { prep?: number; cook?: number; total?: number };   // minutes
  sections: { title?: string; steps: Step[] }[];
  ingredients: Ingredient[];   // flattened, with section refs
  cookware: Cookware[]; timers: Timer[];
  grocerySections: Map<ingredientId, Section>;  // classified at BUILD time
  jsonld: object;              // built here, correctly
}
```

Every page consumes this one type. `getStaticPaths`, index, tags, RSS, search-index all call the same helpers (`getAllRecipes()`, `getTagIndex()`).

**Classification moves to build time.** `grocery-sections.ts` + the JSON rules file run during the build; each ingredient ships with its section. The runtime `FoodClassifier` class, its `fetch()`, `window.BASE_URL`, and the polling loop all disappear. User corrections are stored client-side as overrides (see §4) — exactly Tandoor's "drag into category, remembered" behavior, minus the server.

## 3. Quantities: one module, two consumers

`lib/quantities.ts` is the single source of truth (imported by Astro components at build *and* by client scripts for scaling):

- value model: `{ n: number }` + fraction-aware formatter (nearest-denominator, the good algorithm from `unit-converter.ts`)
- unit model: dimension analysis (volume/mass/count) with the alias table merged and deduplicated
- `scale(recipe, factor)` pure function; `format(qty, unit, { system: 'us'|'metric' })`
- display preference (fractions vs decimals, US vs metric) is a client pref that re-renders `[data-qty]` elements

This deletes: `quantity-formatter.ts`, `formatQuantity` in `unit-converter.ts`, both copies in `RecipeSteps.astro`, `formatFraction` in `IngredientList.astro`, and the entire `public/scripts/` trio.

## 4. Client state (the "backend" that isn't)

One tiny typed store (no framework needed; ~100 lines) instead of globals and inline classes:

```ts
// lib/client/store.ts
defineStore('shoppingList', schema, { persist: 'local' })  // zod-ish validation on read
defineStore('prefs', ...)       // theme, view, measurement system
defineStore('cook:<slug>', ...) // per-recipe step check-offs, timers
```

- **Safe**: validated parse; corrupt state resets that slice, never throws (fixes audit 1.4 class of bugs).
- **Reactive**: pub/sub; components subscribe; no `window.*` coupling.
- **Shopping list model** (informed by Mealie/Tandoor):

```ts
{ items: [{ id, name, qty?, unit?, section, checked, manual? }],
  recipes: [{ slug, title, factor, addedAt }],
  sectionOverrides: { "scallion": "Produce" },
  version: 2 }          // + migrate()
```

  Features enabled by the model: check-off persistence, per-recipe expander, manual items, undo (action → inverse, kept in memory), export/import JSON, copy-as-text/CSV, share via URL hash (`#list=<deflate+base64>` → read-only static view).
- **Upgrade path**: if sync is ever wanted, the store interface is the seam for a CRDT/oplog (e.g. pull-based via a gist) — but that's a different product decision; nothing here assumes it.
- Keep localStorage now; IndexedDB only if lists plausibly exceed ~1k items. Don't gold-plate.

## 5. Page data flow (static, but not dumb)

- Recipe page: recipe JSON embedded once via `<script type="application/json" data-recipe>`; client modules read **that**, not the DOM (deletes the `data-base` scraping in `recipe-shopping-list.ts`).
- Search: **Pagefind** — indexes rendered HTML (titles, ingredients, steps), static chunks, ships its own accessible UI; options for facet metadata. No backend, works at 1k recipes.
- PWA: keep `@vite-pwa/astro`. Precache app shell + index data; **runtime-cache recipe pages and images on visit** so "cook offline" is real. Manifest from `PUBLIC_*` env (already good); add maskable icon; `theme_color` from the same token as CSS.

## 6. Images

`astro:assets` end-to-end:
- local images (`recipes/images/…`) via `<Image>` → responsive srcset, AVIF/WebP, explicit dimensions (CLS fix);
- remote images: download-at-build script into `public/` or Astro `image.remotePatterns` — no hotlinking in production;
- no-image recipes get a designed placeholder (SVG pattern + category color), replacing "🍳 No Image".

## 7. SEO pack

- `@astrojs/sitemap`, `public/robots.txt`, custom `404.astro`.
- `Base.astro` renders: canonical, full OG set, Twitter summary_large_image, `<title>{title} · {siteName}</title>`, RSS/alternate links, `color-scheme`, theme boot script (FOUC fix).
- JSON-LD assembled in `lib/` from the normalized recipe (correct `recipeIngredient`, `HowToStep` texts, `author`, `datePublished`, `keywords`); add a build-time assertion that instructions are non-empty — the current bug class becomes unshippable.

## 8. Quality gates

- **Vitest**: unit tests for `quantities`, `shopping`, `taxonomy`, `cooklang` wrapper (fixture `.cook` files incl. malformed). The pure core finally gets the coverage `CONCERNS.md` asked for.
- **Playwright**: 5 smoke flows — browse/search, recipe+scale, cook-mode timer, shopping-list add→aggregate→check→export→undo, offline reload (PWA).
- **axe** checks in e2e; `astro check` + Biome/ESLint+Prettier as `npm run check`; PR workflow runs check+test+build (root-base AND subpath-base to catch BASE_URL regressions); deploy workflow unchanged in shape.
- Renovate already exists — keep.

## 9. Migration strategy (strangler, not big-bang)

The re-architecture lands in the order that de-risks it (details in 06):

1. Fix the four critical bugs *in place* (P0) — small diffs, immediately shippable.
2. Introduce `lib/` + Content Collections; rewrite pages onto it **one page at a time** (index → [slug] → tags → rss). Old utilities delete when the last caller goes.
3. Client store + shopping-list rewrite (the broken feature becomes the best feature).
4. Design system + page redesigns (05).
5. Cook mode, planner, collections (Tier 1/2 features).

At no point is the site un-deployable; each phase ends green.
