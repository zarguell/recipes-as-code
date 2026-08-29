# 01 — Codebase Audit

Method: full read of `src/` (~4,500 LOC), configuration, CI, and `.planning/` docs; production build executed (`npx astro build`); generated output in `dist/` inspected to verify runtime behavior. Anything marked **VERIFIED** was confirmed against the build output, not just read.

---

## 1. Critical bugs (user-visible, in production today)

### 1.1 The shopping list page never initializes — VERIFIED (Critical)

`src/pages/shopping-list.astro` loads its logic with:

```html
<script is:inline type="module">
  import { FoodClassifier } from '../../utils/food-classifier.js';
  import { parseQuantityAndUnit, ... } from '../../utils/unit-converter.js';
  ...
</script>
```

`is:inline` scripts are **not processed by Vite/Astro** — they ship verbatim. The browser resolves `../../utils/food-classifier.js` relative to the page URL → `/utils/food-classifier.js`. The sources are `.ts` files; **no `dist/utils/` directory exists** (verified). Every import 404s, the module fails to load, and none of the page's JS runs:

- the pre-rendered empty state always shows, even when recipes were added;
- the only working path (`Layout.astro`'s global `ShoppingList` class) still stores data to localStorage that can never be displayed;
- the "Clear all" button does nothing.

Secondary effect: the user's first encounter with the flagship feature is a permanently broken page.

### 1.2 Ingredient aggregation crashes on null — VERIFIED by code read (Critical)

`src/utils/shopping-list-aggregator.ts:30`:

```ts
const normalizedName = normalizeIngredientName(null, ingredient.name);
```

and the wrapper immediately calls `classifier.normalizeIngredient(name)` on that `null` → `TypeError`. Even if 1.1 were fixed by moving files, aggregation would throw on the first ingredient. The unit-converter and renderer modules wired to it are effectively dead code.

### 1.3 JSON-LD `recipeInstructions` ships empty strings — VERIFIED (High)

`src/utils/recipe-metadata.ts` — `getStepText(items, cookwareList, timersList)` requires three arguments and guards with `if (!Array.isArray(cookwareList)) return "";`. The only call site passes one argument:

```ts
recipeInstructions: steps.map((step) => ({
  "@type": "HowToStep",
  text: getStepText(step.items || []),   // cookware/timers missing → ""
}))
```

Built output confirms: every step is `{"@type":"HowToStep","position":n,"text":""}`. Google Recipe rich results are impossible with empty instructions; this also undermines the otherwise-good decision to emit structured data at all.

### 1.4 Unsafe localStorage parse can brick every page (High)

`Layout.astro` (`ShoppingList.loadList`) and `ThemeToggle.astro` do `JSON.parse(localStorage.getItem(...))` without try/catch (ThemeToggle validates the string, but the Layout does not). One corrupted write → exception at body-parse time → `window.shoppingList` never exists → every "Add to shopping list" click alerts "Shopping list not available". `CONCERNS.md` documents this; still unfixed.

### 1.5 Four divergent recipe-loading pipelines (High, architectural)

The same fundamental operation — read `.cook`, extract frontmatter, parse, merge metadata — is implemented four different ways:

| Location | Technique | Frontmatter merged? |
|---|---|---|
| `src/utils/parse-recipe.ts` | regex + `js-yaml` + parser | ✅ frontmatter wins |
| `src/pages/recipes/[slug].astro` | `parseFrontmatter()` (its *own* copy of the regex), then `new Recipe()` | ✅ manual merge |
| `src/pages/tags/[tag].astro` `getStaticPaths` | `new Recipe(fullContent)` | relies on parser tolerance of `---` blocks |
| `src/pages/rss.xml.ts` | `new Recipe(fullContent)` | ❌ no merge — titles fall back to slug; `pubDate` defaults to **build time** for undated recipes (everything looks "new" on every deploy) |
| `src/pages/index.astro`, `tags/index.astro` | `parseRecipeFile()` | ✅ |

Consequences today: RSS titles are slugs (`example`, not the recipe name), and tag behavior silently depends on which parser code path you hit. Any metadata feature (dates, images, nutrition) must be patched in four places.

### 1.6 InnerHTML XSS in shopping-list rendering (High when 1.1 is fixed)

`src/utils/shopping-list-renderer.ts` interpolates `recipe.title` and `ingredient.name` into `innerHTML` unescaped. Content comes from the repo, so the attacker is "whoever can push a recipe," but this is exactly the vector a shared/template repo has (fork a template, add a recipe with `<img onerror=...>` in the title). `CONCERNS.md` flags it as HIGH; the code path is currently dead only because of bug 1.1.

### 1.7 `set:html` with regex-highlighted source (Medium)

`CooklangSourceBlock.astro` builds HTML via chained string regexes and injects with `set:html`. Recipe content containing `<` / attributes passes straight through. Same trust model issue as 1.6. Prefer `textContent` + CSS, or escape before highlighting.

---

## 2. Correctness / consistency issues

- **Flat recipe discovery.** `readdir(recipesDir)` is non-recursive; the README's own CI recipe copies `recipes/**` recursively. Sub-folders (e.g. `recipes/desserts/cake.cook`) are silently dropped from index, tags, RSS… but *are* copied into `dist/` by `prebuild`. Silent data loss.
- **Stale duplicate scripts ship to production — VERIFIED.** `public/scripts/{quantity-formatter,recipe-scaler,recipe-shopping-list}.js` are byte-identical ancestors of `src/scripts/*.ts` (the git history shows the `.ts` copies were created from them). `public/` is copied verbatim into `dist/`, so dead code ships on every page. They also differ subtly from the live versions (e.g. the `public` scaler targets `#ingredientList` only), which makes "which one runs?" unanswerable.
- **Shopping-list store exists twice**: `Layout.astro` inline `class ShoppingList` (the live one) and `src/scripts/recipe-shopping-list.ts` + its `public/` ghost (which assume `window.shoppingList` exists — implicit global coupling).
- **Fraction formatting exists 5×**: `unit-converter.ts` (`formatQuantity`), `quantity-formatter.ts`, `RecipeSteps.astro` frontmatter, `RecipeSteps.astro` *inline script again* (full re-implementation for step chips), `IngredientList.astro` (`formatFraction`, different algorithm — simplifies with gcd instead of nearest-denominator). Displays can disagree between the ingredient list and the step chips of the same recipe.
- **Ingredient quantity display inconsistency**: step chips render decimals via `Number(qty)` (`0.5 cup`), ingredient list renders fractions (`1/2 cup`). Same recipe, two conventions.
- **Timer rendering is guessed from a string**: `RecipeSteps.renderTimer` special-cases `"minutes|4%minutes"` — encoding knowledge of the parser's internal range representation with a string split. Brittle coupling to `@tmlmt/cooklang-parser` internals; the parser's actual output shape should be normalized in exactly one place.
- **Dead/error-path image placeholder**: `Layout.astro`'s global `error` listener checks `e.target.src.includes('No Image')` — a broken image's `src` never contains "No Image", so the SVG fallback never fires. The inline `onerror` attribute handles it instead; the listener is dead weight and the two mechanisms overlap confusingly.
- **`view-controls` script duplicated** in `index.astro` and `tags/index.astro`; the regex `className.replace(/view-\w+/g, '')` will also eat unrelated classes that start with `view-`.
- **Tags**: no slug normalization. Tags with spaces, unicode, or case variants ("Italian", "italian") create duplicate/odd URLs. `tags/index.astro` links `${base}tags/${tag}/` without encoding.
- **Search**: client-side DOM filter over card `data-*` attributes only — no ingredient/body search, no index. Fine at 20 recipes; useless at 500 (and there's no pagination at any size).
- **`BASE_URL` joining** relies on the subtle fact that `import.meta.env.BASE_URL` ends with `/` under `trailingSlash: 'always'`. Works today; one config change from breaking every link. Should be one `url()` helper.
- **Theme flash (FOUC)**: theme is applied by an inline script at the top of `<body>`; `:root` defaults to light. Dark-theme users get a light flash on every navigation (MPA). Standard fix: tiny blocking script in `<head>` + `color-scheme` meta.
- **PWA/branding drift**: manifest `theme_color`/CSS accent/`theme-color` meta disagree (`#ff6b35` orange vs `#ff6b6b` red vs hardcoded blue hovers like `#0770c9`, `#5db2ff` scattered through page styles). Also `apple-mobile-web-app-title` appears twice in `<head>`.
- **`prebuild: cp -r recipes public/`** exists solely so the "Download .cook" link works; it ships all raw recipes and couples the download feature to a hidden build step.
- **`confirm()` for destructive actions** — no undo anywhere (Mealie/Tandoor both use undo-friendly flows; on a static site "undo" is trivial since state is local).

## 3. Accessibility

- Emoji as the only iconography (🛒 🏷️ 📡 🖨️ 👨‍🍳 …) — screen readers announce "shopping trolley", "cook", "man cook" etc.; several buttons have no accessible name beyond the emoji.
- No skip-to-content link; no `<nav>`/landmarks (`Layout` is bare `<main>`); heading order issues (`tags/[tag].astro`: `<h1>Recipes tagged with</h1>` + separate badge with the actual tag).
- Search inputs have no associated `<label>`/`aria-label`.
- Step checkboxes hide instruction text via CSS when checked (`white-space: nowrap; overflow: hidden`) — content is still "there" but visually destroyed; checkbox-as-collapse without `aria-expanded` semantics.
- Focus styles rely on browser defaults; hover-only affordances (`transform` on cards) without `:focus-visible` equivalents.
- No `prefers-reduced-motion` handling beyond one transition; card hover translate animations are minor but pervasive.

## 4. SEO / discoverability

Present: RSS, JSON-LD (broken, see 1.3), per-page `<title>`, description meta on some pages, PWA manifest.

Missing: canonical URLs, OpenGraph `og:title/og:type/og:url` (only `og:image`), Twitter cards, `sitemap.xml`, `robots.txt`, custom 404 page, site-name suffix in titles, `lastmod`/real dates anywhere, hreflang/i18n groundwork. For a public recipe site whose main acquisition channel is search, this is a strategic gap, not a nicety.

## 5. Performance

- **Images are unmanaged**: raw `<img>` with no `width`/`height` (CLS on every card), no `srcset`, external images hotlinked (no optimization, privacy leak to third parties, dead images offline). Astro's `astro:assets` is unused.
- Full CSS ships on every page via one global `<style>` in `Layout.astro` (~300 lines incl. grid variants) + per-page styles; fine at this scale but it blocks systematic theming.
- Search loops the DOM on every keystroke; no debounce; no index.
- PWA precache glob includes `**/*.json` — fine — but runtime recipe pages aren't cached for offline *cooking* unless visited; no explicit offline strategy (see 04).
- Good: no framework runtime, tiny JS, MPAs are inherently fast. The foundation is genuinely fast — it's just unpolished.

## 6. Tooling, testing, CI

- **Zero tests.** No runner installed. The most testable parts of the codebase (pure functions: fractions, unit conversion, aggregation) are exactly the parts with 5 divergent copies — i.e., the parts most likely to regress.
- No ESLint/Prettier/Biome; DeepSource configured but that's not a local gate.
- No `typecheck` script (`astro check` not wired); `tsconfig` is strict (good) but `any` is endemic — `parsed: any` at the boundary (`parse-recipe.ts`) laundering all downstream types.
- CI only builds; PRs get no lint/type/test signal. The deploy workflow builds with `CI: true` but nothing fails on warnings.
- `package.json` name is `recipe-site` (repo is `cooklang-recipes`); no `engines` field; no `prepare`/hooks docs. Minor.
- Dependency choice: `@tmlmt/cooklang-parser` is a niche parser; the official `@cooklang/parser` (TypeScript, spec-conformant, maintained by the Cooklang org) should be evaluated — parser quirks (timer ranges as `"minutes|4%minutes"`) are currently leaking into UI code, which is the symptom of wrapping it too thinly.

## 7. What's genuinely good (keep)

- Static Astro + Git-as-CMS + template-repo deployment is a coherent, differentiated architecture. Keep.
- PWA, dark mode with system preference + persistence, RSS, JSON-LD intent, tag pages, print button: right instincts.
- `astro.config.mjs` base-path handling for GitHub Pages project sites is thoughtful and documented.
- JSDoc coverage on utilities is above average for a personal project.
- The Cooklang *source* display with download is a differentiator neither Mealie nor Tandoor has — keep, but collapse it and fix injection.
- `.planning/` documentation culture is unusually good; the audit below updates `CONCERNS.md` (several items are now worse than recorded: aggregator null-crash and the dead shopping-list page were not on the list).

---

## 8. Priority-ranked fix list

| # | Issue | Severity | Effort |
|---|---|---|---|
| 1 | Shopping-list page imports 404 (1.1) | Critical | S |
| 2 | Aggregator null crash (1.2) | Critical | S |
| 3 | JSON-LD empty instructions (1.3) | High | S |
| 4 | Unsafe localStorage parse (1.4) | High | S |
| 5 | Delete `public/scripts/*` dead code | High | S |
| 6 | innerHTML XSS in renderer (1.6) | High | S |
| 7 | Unify recipe loading → one pipeline (1.5) | High | M |
| 8 | RSS frontmatter + real dates | Medium | S |
| 9 | Recursive recipe discovery | Medium | S |
| 10 | SEO pack (canonical, OG, sitemap, robots, 404) | Medium | M |
| 11 | Theme FOUC + branding color drift | Medium | S |
| 12 | Test harness + first unit tests | High | M |
| 13 | Image pipeline (`astro:assets`) | Medium | M |
| 14 | A11y pass (labels, landmarks, emoji, focus) | Medium | M |
