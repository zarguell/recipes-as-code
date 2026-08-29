# Get-Well Review — cooklang-recipes

**Date:** 2026-02 · **Scope:** full end-to-end review of code quality, architecture, product features, and UI/UX, benchmarked against Mealie and Tandoor Recipes, with a static-only constraint (no backend, ever).

## Verdict (TL;DR)

The idea is strong — a zero-backend, Git-as-CMS, Cooklang-native recipe site — but the current implementation is not healthy. **Two of the five features that define the product are broken in production right now** (the shopping list page and structured data for SEO), the codebase carries 4+ divergent copies of its core logic, there are zero tests, and the UX is well behind the bar that Mealie/Tandoor have set for what a recipe app should feel like.

None of this requires a rewrite of the *concept*. It requires (1) urgent bug fixes, (2) consolidating recipe loading/formatting/aggregation into one typed core, and (3) a deliberate redesign of the UI around the two things a static site can do better than a server app: **instant everything** and **100% local, private user state** (cook mode, shopping list, planner).

**Recommended posture: evolve, don't rewrite.** Astro stays. The fs/readdir data layer is replaced by Astro Content Collections. The four divergent recipe pipelines collapse into one. The UI gets a design system and a cook-mode-centered recipe page.

## Status

- **Phase 0 (hotfixes): SHIPPED** — all critical/high fixes from `01-codebase-audit.md` are implemented and verified against a production build (see `06-roadmap.md` for the list). Test suite added (Vitest, `npm test`).
- **Phase 2/3 highlights: SHIPPED** — cook mode (`/recipes/[slug]/cook/`) with live timers, wake lock, resume, keyboard nav; shopping-list v2 (per-recipe expander, checked-state persistence, copy/CSV/JSON export, import, clear-with-undo toast, print); servings stepper + scaled-servings display; dedicated recipe print stylesheet; design tokens module + skip link + focus-visible + reduced-motion + aria labels; home sorting (A–Z / newest / fastest); PWA runtime caching (visited recipes readable offline).
- **BONUS latent-bug fix (found during cook-mode build):** parser step tokens use `index`, not `value`, and per-token quantities live in `quantityParts`. Cookware names, timer durations, and step-chip quantities were silently rendering as `"cookware"` / `" minutes"` / empty everywhere. Now resolved once in `src/lib/recipes.ts` (`resolveSteps()`), covered by regression tests.
- **UI/UX redesign SHIPPED** — see `07-ui-ux-audit.md` (code-level audit of Mealie + Tandoor). Warm Mealie-derived palette (`#E58325` primary / `#007A99` teal / `#1E1E1E` dark), MDI icon system (`Icon.astro`, zero emoji chrome), application shell (app bar + persistent desktop sidebar + mobile bottom nav), Mealie-style recipe cards (fixed image, meta chips, aligned footers), recipe page ingredients/instructions split with thin divider + sticky panel, icon-only toolbars.
- **Remaining:** content-collections migration, `astro:assets` image pipeline, aisle overrides.
- **Backlog round SHIPPED** — Pagefind full-text search (indexes recipe bodies incl. ingredients/steps; DOM-filter fallback in dev), favorites (star on cards + recipe page, filter chip on home), recently-viewed strip, collections/"cookbooks" (`collections.yml` → `/collections/<slug>/` pages + home links), meal planner (`/planner/` — 7-day grid, local-only, one-click "add week to shopping list"), frontmatter validation (unknown keys warn, bad types fail the build).
- Quick regression check: `npm test && npm run build`, then confirm `dist/shopping-list/index.html` references a bundled `/_astro/*.js` script and the recipe page's JSON-LD has non-empty `text` fields.

## Document map

| Doc | Contents |
|---|---|
| [01-codebase-audit.md](01-codebase-audit.md) | Verified bugs (with build-output evidence), duplication map, security, a11y, SEO, performance, tooling gaps |
| [02-competitive-analysis.md](02-competitive-analysis.md) | Mealie & Tandoor feature/UX teardown; adopt / adapt / skip table for a static architecture |
| [03-product-definition.md](03-product-definition.md) | Positioning, personas, the feature set this project should actually have |
| [04-target-architecture.md](04-target-architecture.md) | Re-architecture: content layer, core domain lib, client store, search, PWA, testing, CI |
| [05-ui-ux-redesign.md](05-ui-ux-redesign.md) | Design language, IA, page-by-page redesign, cook mode, print, accessibility |
| [06-roadmap.md](06-roadmap.md) | Phased plan: P0 hotfixes → P1 foundations → P2 redesign → P3 features, with acceptance criteria |

## Top 5 findings

1. **The shopping list page is dead code in production.** Its inline `<script type="module">` imports `../../utils/*.js` paths that don't exist in the build output (the sources are `.ts`; `is:inline` scripts are never bundled). The imports 404, the whole page never initializes — users who add recipes see an empty list forever. Verified in `dist/shopping-list/index.html`; there is no `dist/utils/` directory.
2. **Even if it loaded, aggregation crashes.** `aggregateIngredients()` calls `normalizeIngredientName(null, …)` → `null.normalizeIngredient()` throws. The shopping list has never been able to aggregate. (`src/utils/shopping-list-aggregator.ts:52`)
3. **SEO structured data is empty.** Every recipe page ships `recipeInstructions: [{ "text": "" }, …]` because `generateJsonLdSchema()` calls `getStepText(step.items)` without the required cookware/timers arguments, and the guard returns `""`. Verified in `dist/recipes/example/index.html`. Recipe rich results are impossible.
4. **The same logic exists 3–5 times in incompatible variants.** Recipe loading (4 implementations), fraction formatting (5), frontmatter parsing (2), the shopping-list store (2), view-toggle script (2), back-button CSS (5). The `.planning/codebase/CONCERNS.md` file already knew about several of these; the code has drifted since.
5. **Feature gap vs. Mealie/Tandoor is mostly *state*, not *server*.** The features that make those apps feel good — cook mode with live timers, shopping lists with aisle grouping, check-off persistence, scaling — are all client-side state problems. A static site can have every one of them via localStorage/IndexedDB. What we should *not* copy: accounts, CRUD editors, server sync.

## The one-sentence strategy

> Be the best *reading and cooking* experience for a personal Cooklang collection on the web — instant pages, works offline, private by design — and let Git be the CMS.
