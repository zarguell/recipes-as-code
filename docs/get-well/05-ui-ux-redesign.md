# 05 — UI/UX Redesign

Goal: look and feel like the best of Mealie/Tandoor while expressing what they can't — instant pages, source-available recipes, total privacy. Design language first, then IA, then page-by-page.

---

## 1. Design language

### Tokens (`styles/tokens.css`) — single source, themed once

```css
:root {
  /* one accent, one warm neutral ramp — kills the red/blue/orange clash */
  --accent-600: #d9480f;  --accent-700: #b23c0c;      /* terracotta: food-adjacent, AA on white */
  --bg: #faf7f2;  --surface: #ffffff;  --surface-2: #f3eee6;
  --text-1: #1f1a15;  --text-2: #6b6259;  --border: #e5ddd0;
  --radius: 12px; --radius-sm: 8px;
  --shadow-1: 0 1px 2px rgb(28 20 12 / .06), 0 4px 12px rgb(28 20 12 / .06);
  --space-1..8 (4/8/12/16/24/32/48/64); --font-sans/--font-display;
}
[data-theme="dark"] { …derived ramp, --color-scheme: dark; }
```

- **Icons**: inline SVG set (single `Icon.astro`, stroke style) — no emoji in UI chrome. Emoji stay allowed *inside recipe text* only.
- Type scale (modular, 1.25), display font optional for h1; system stack by default, zero webfont requests.
- Elevation: cards on `--surface`, page on `--bg`; hover lifts 2px + shadow; `:focus-visible` ring on everything interactive.
- Motion: 150–200ms ease-out; all gated by `prefers-reduced-motion`.
- Density: comfortable default; list view is the "dense" mode (drop Mealie's separate density setting).

## 2. Information architecture

```
Header (all pages):  [Logo] Recipes  Collections  Tags │ 🔍 Search │ [theme] [install]
                     (mobile: logo + search icon; bottom bar: Recipes · List · Cook recent)
Footer: RSS · About · "Powered by Cooklang · no cookies, no tracking" (say it out loud)
```

Routes: `/`, `/recipes/[slug]/`, `/recipes/[slug]/cook/` (cook mode), `/collections/[name]/`, `/tags/[tag]/`, `/tags/`, `/shopping-list/`, `/planner/` (T2), `/404`.

Kill today's button-farm headers ("Shopping List / Browse Tags / RSS" as in-content buttons) — navigation lives in chrome.

## 3. Page specs

### 3.1 Home `/`
- **Search-first** (Tandoor): large search input (Pagefind, `/` shortcut) above the grid.
- Facet row: category chips + top tags (with counts) + sort (A–Z · newest · fastest) + grid/list toggle (persisted).
- Grid: `repeat(auto-fill, minmax(260px, 1fr))`; fixed 16:10 media box; card = image → title → meta chips (⏱ total · 🔔 servings) → up to 3 tags. Hover/focus lift. Designed placeholder when no image.
- Result count + empty state with suggestions.

### 3.2 Recipe `/recipes/[slug]/`
```
┌───────────────────────────────────────────────┐
│ ← All recipes            [♡] [🖨] [🔗] [▶ Start cooking] │
│ TITLE (display)                                │
│ description · source link                      │
│ [⏱ 25 min] [🔪 10] [🔥 15] [ servings − 4 + ] │  ← chips + stepper (Mealie pattern)
│ #tags…                                        │
├──────────────┬────────────────────────────────┤
│ INGREDIENTS  │ INSTRUCTIONS                   │
│ (sticky)     │ section A                      │
│ scale-aware  │ ☐ 1. step… [chip 200 ml milk]  │
│ ☐ items      │ ☐ 2. step… [⏱ 15 min]          │
│ per-item 🛒  │ section B …                    │
│ [Add all 🛒] │ Cooklang source ▸ (collapsed)  │
└──────────────┴────────────────────────────────┘
```
- **Servings stepper** (− / value / +) replaces the bare number input; scaling updates the sticky panel, step chips, *and* stays consistent (one formatter).
- Ingredient rows: check-off (persisted per recipe), quantity in accent chip, per-row "add to list"; "Add all to shopping list" as the primary CTA (both competitors put it here, not just in a header).
- Step chips: ingredient/timer tokens as today (good idea, keep), but timers are **live** — tap to open a countdown (see 3.3).
- Cooklang source + download move into a collapsed `<details>` — it's a differentiator, not the second section of the page.
- Nutrition (if frontmatter) as a small table under ingredients.
- JSON-LD fixed; print button → print stylesheet (§5).

### 3.3 Cook mode `/recipes/[slug]/cook/` (the flagship)
- Full-screen, landscape-friendly; huge step text; progress dots; prev/next + swipe.
- Per-step ingredient peek (the chips), check-off with satisfying animation.
- **Live timers**: `~{15%minutes}` tokens become buttons → countdown ring, title = step, audio + vibration on done, persists across navigation (store-backed).
- Wake Lock while cooking; "keep screen on" indicator; everything works offline (runtime-cached).
- Entry points: "Start cooking" button on recipe page; deep-links reset to step 1 *unless* a session exists (resume prompt).

### 3.4 Shopping list `/shopping-list/`
- Two-pane (mobile: tabs): **Items by aisle section** (build-time classification + user overrides from the store) and **Recipes on list** (Mealie's expander: recipe → its ingredients, tap title → recipe).
- Interactions: check-off (persisted), +/− quantity, add manual item, remove recipe, **Clear with undo toast** (no `confirm()`).
- Toolbar: export (copy text / CSV / JSON download), share via link (hash-encoded), print.
- Empty state: keep today's (it's good) + "add from any recipe" hint.

### 3.5 Tags & collections
- `/tags/`: all tags with counts, grouped by category facet; `/tags/[tag]/`: grid + lead description (auto or authored in `taxonomy.yml`).
- Collections (T2) = "cookbooks": `collections.yml` defines name + filter (tags/category) → static pages. This is how families make "Christmas baking" without a database.

### 3.6 Planner (T2)
Week grid (Mon–Sun, lunch/dinner slots), drag recipes from a tray, "Create shopping list from week" → feeds the same store. Local only; export plan as text.

## 4. Interaction states & system behaviors

- **Persistence contract**: theme, view, measurement system, favorites, recent, per-recipe cook state, list — all in the typed store; survive reloads; never throw (validated).
- **Undo everywhere**: list clears/removals via toast (5s); no native dialogs anywhere.
- **Empty/loading/disabled**: every async surface has a designed state (spinner only as last resort — most things are instant).
- **Offline**: installable; banner on `online/offline` events; visited recipes readable; list/cook-mode fully functional; service worker updates applied on next load (autoUpdate already set).
- **A11y**: landmarks + skip link; labeled inputs; icon buttons get `aria-label`; step check-off is a real checkbox with `aria-expanded` semantics for the collapse; tokens are links/buttons with names; AA contrast on both themes; axe in CI.

## 5. Print stylesheet (dedicated, not an afterthought)

Recipe print = title, meta chips, scaled ingredients as checklist, instructions, source/URL footer, QR to the live page. Hides: nav, buttons, cook-mode, related. `@media print` lives beside the recipe component, tested in e2e (pdf snapshot).

## 6. What we deliberately keep from the current UI

- Grid/list/compact view toggle idea (persisted) — Mealie doesn't even have list density.
- Step ingredient chips + collapsible checked steps.
- Cooklang source viewer with wrap toggle (moved into `<details>`).
- Empty-state copy on the shopping list.
- Dark mode three-way preference (light/dark/system) — keep, but boot it in `<head>`.
