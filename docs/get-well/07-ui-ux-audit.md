# 07 — UI/UX Audit: Mealie & Tandoor (code-level)

This is a design audit based on the **actual frontend source** of both projects (shallow-cloned for analysis), not their marketing sites. Everything below was extracted from code:

- Mealie: `frontend/` — Nuxt + **Vuetify** (`vuetify.options.js`, `app/plugins/theme.ts`, `components/Layout/*`, `components/Domain/Recipe/*`, `components/Domain/ShoppingList/*`)
- Tandoor: `cookbook/templates/base.html`, `cookbook/static/themes/tandoor.min.css`, `vue3/src/pages/SearchPage.vue`, `vue3/src/components/display/{RecipeCard,RecipeView,StepsOverview}.vue`

---

## 1. Extracted design systems

### 1.1 Color

| Token | Mealie | Tandoor | Ours (today) |
|---|---|---|---|
| Primary | `#E58325` (warm orange) | `#B98766` (warm tan); nav bg `#DDBF86` (golden) | `#ff6b6b` (red) + stray `#0984e3` blue + `#ff6b35` theme-color + hardcoded blues |
| Accent/secondary | `#007A99` (deep teal) | `#B55E4F` (terracotta) | same blue, used as "secondary button" |
| Success | `#43A047` | `#82AA8B` (sage) | none |
| Warning | `#FF6D00` | `#EAAA21` | none |
| Error | `#EF5350` | `#A7240E` | none |
| Dark surface | `#1E1E1E` | (theme files) | `#1a1f2e` (cold navy — clashes with warm accent) |

**Conclusion:** both incumbents use a **warm, food-adjacent, single-primary palette** with one muted secondary hue. Our red+blue two-accent scheme is the single biggest reason the site "doesn't look like a recipe app."

### 1.2 App shell / navigation

**Mealie** (`DefaultLayout.vue`, `AppHeader.vue`, `AppSidebar.vue`):
- **Primary-colored app bar** (orange, white content), compact density: hamburger (mobile) → logo+wordmark → (spacer) → global search field (readonly field that opens a search overlay; icon button on mobile) → context actions.
- **Persistent left sidebar** on `lg+`, drawer below. Order: **Recipes, Recipe Finder, Meal Planner, Shopping Lists, Timeline, Cookbooks, Organizers (▸ Categories / Tags / Tools)**, then user's cookbooks inline. "Create" button sits at the top of the sidebar.
- Sidebar state: open on desktop by default (`display.lgAndUp`), collapsible.

**Tandoor** (`base.html`):
- **Top navbar** (golden `#DDBF86` default, brand icon + collapsible menu).
- Content in a **3-column grid**: `col-xl-2` (left rail: filters on search) / `col-xl-8` (content) / `col-xl-2` (right rail).
- Responsive: left rail appears only on `xl`.

**Conclusion:** both have **permanent, icon+label navigation chrome that exists outside page content**. Our site has zero chrome — navigation is buttons buried in page headers, different on every page.

### 1.3 Card grid & recipe cards

**Mealie** (`RecipeCard.vue`, `RecipeCardSection.vue`):
- Grid: `cols=12 / sm=6 / lg=4` → 1 / 2 / 3 columns.
- Card: **200px cover image** (fixed height), title `1.25rem`, tag **chips limit 2**, footer row with favorite badge + rating, `min-height: 84px` footer so cards align regardless of chip count.
- Elevation 2 at rest → **12 on hover**; description **reveals over the image on hover** (secondary-tinted overlay, 0.8 opacity).

**Tandoor** (`RecipeCard.vue` in vue3, `SearchPage.vue`):
- Grid: `cols=6 / md=4` → 2 / 3 columns.
- Card: image `rounded-lg` top, **bold name**, keyword chips `x-small outlined label` **max 3**, **time chip with clock icon**, context menu top-right.
- Search page has **list/grid view toggle** and per-page size selector; filters in the collapsible top panel / left rail.

**Conclusion:** converged standard = **3 columns desktop, 2 tablet, 1 mobile; fixed-ratio image; bold title; ≤3 outlined chips; compact meta chips with icons; aligned footers; hover elevation**.

### 1.4 Recipe detail page

**Mealie** (`RecipePage.vue`):
- Two columns: `md=4` **ingredients left** / `md=8` instructions right.
- Left column separated by **`border-e-thin`** (a thin vertical rule, not a card box).
- Ingredients **grouped by section, each with checkbox**; scale shown as chips; organizers (tags) below on desktop.
- Instructions: one **card per step**, step title + optional summary; steps checkable; cook mode removes the left column and widens instructions; wake-lock switch present.
- Title block: `text-h5 font-weight-regular` centered on the info card with image.

**Tandoor** (`RecipeView.vue`, `StepsOverview.vue`):
- Header card: image, name (bold, truncates), keyword chips, meta columns (properties/nutrition), **servings scaler** (dialog with stepper), context menu.
- `StepsOverview`: ingredients + steps in `md=6` pairs per section; steps as bordered cards; wake lock; per-step ingredient checkboxes.

**Conclusion:** converged standard = **ingredients-left / instructions-right at 1:2, thin vertical divider, sticky ingredient panel, checkbox-per-ingredient grouped by section, servings stepper near the title, steps as quiet cards (not boxed lists)**.

### 1.5 Shopping list

**Mealie** (`ShoppingListItem.vue`): rows with **checkbox → `strike-through` class on check**, quantity + unit + food laid out inline, per-item context menu, recipe references shown under linked items, labels as colored sections; checked items collapse into an "items checked" area.

**Tandoor** (`docs/features/shopping` + list page): grouped by supermarket category order, drag-to-categorize remembered, export with prefix, autosync.

**Conclusion:** we already match the interaction model (check-off, recipe refs, sections) — our problem is presentation, not function.

### 1.6 Density, type, icons

- Mealie: Vuetify **compact density** app bar, `text-h5` recipe title (`font-weight-regular`), `1.25rem` card titles, MDI SVG icon set **everywhere** (never emoji).
- Tandoor: Bootstrap type scale, `font-weight-bold` names, Font Awesome icons, `x-small` `outlined` `label` chips for taxonomy.
- Neither uses emoji as UI icons. Ours is emoji-first (🛒 🏷️ 📡 🍳 👨‍🍳).

---

## 2. Why our current design fails (against this bar)

1. **No navigation chrome** — the #1 structural gap. Every established recipe app has permanent nav; our pages are lone documents with a "back" button and different in-content button rows per page.
2. **Two clashing accents (red + blue) on cold navy dark mode** — reads "admin dashboard", not "food". Both incumbents: one warm primary + one muted secondary.
3. **Emoji as icon system** — noisy, inconsistent rendering, unprofessional at card/header scale.
4. **Meta presented as gray boxes** (uppercase label + big value) — incumbents use compact chips/icons inline.
5. **Card footers unaligned** — chips/meta rows have no reserved height; grids look ragged.
6. **Recipe page boxes-within-boxes** — every section is a shadowed card incl. ingredients + steps; incumbents use one quiet surface with a thin divider between columns.
7. **Header treatment** — buttons as primary+secondary colored blocks; incumbents keep header CTAs quiet (text/icon buttons) and reserve color for one primary action.
8. **Dead space & density** — 2rem gutters, large section padding, 400px max search box; incumbents are denser (compact bars, tighter cards).

## 3. Redesign spec (adopted for our static MPA)

### 3.1 Tokens v2 (`src/styles/tokens.css`)

```css
:root {
  --primary: #E58325;            /* Mealie's warm orange */
  --primary-darken: #c96e1a;
  --accent: #007A99;             /* Mealie's deep teal — links, secondary UI */
  --secondary: #973542;          /* wine — hover-reveal overlays, badges */
  --success: #43A047; --warning: #FF6D00; --danger: #EF5350;
  --bg: #faf9f7;                 /* warm paper */
  --surface: #ffffff;
  --surface-2: #f3efe9;          /* chip / quiet block */
  --border: #e5ddd0;
  --text-1: #2d2a26; --text-2: #6e675e;
  --nav-h: 64px; --sidebar-w: 240px;
}
[data-theme="dark"] {
  --bg: #1E1E1E; --surface: #252525; --surface-2: #2e2e2e;  /* Mealie dark */
  --border: #3a3a3a; --text-1: #e8e4de; --text-2: #a39d94;
  --primary: #E58325; --accent: #4fb3d9; /* accent lifted for dark contrast */
}
```

Single accent pair, warm neutrals, elevation via subtle shadows. All hardcoded blues/oranges in page styles get replaced by tokens.

### 3.2 App shell (the structural fix)

`Layout.astro` becomes a real application shell:

- **App bar** (all sizes, `--primary` background, white content): sidebar toggle (desktop, collapses to icons) / brand mark + site name / search link (focuses search on home; on other pages routes home with focus) / theme toggle / shopping-list quick link with count badge.
- **Sidebar** (desktop `lg+`, persistent; overlay drawer on mobile): nav links with MDI icons — **Recipes, Planner, Shopping List, Tags, Collections** — then **user's collections listed inline** (Mealie's cookbook pattern), then About/RSS at the bottom.
- **Mobile**: bottom tab bar (Home · Planner · List) — thumb-reachable, standard app pattern.
- Content column: `max-width 1200px` centered within the remaining width; print hides all chrome.

### 3.3 Icon system

`Icon.astro` — inline MDI SVG paths (forklift-knife, search, calendar-month, cart / format-list-checks, book-open-variant, tag, star, clock-outline, printer, chevron-left/right, plus, minus, close, theme-light/dark, download, content-copy, upload, view-grid/list). Zero emoji in chrome.

### 3.4 Components

- **RecipeCard v2**: 200px cover → title 1.25rem `font-weight:500` → footer row with **min-height** (aligned) holding time chip (clock icon) + servings, tag chips (≤3, `surface-2`, small); elevation 2→8 hover; favorite star overlay top-right (existing).
- **Chip** (`.chip` base): small, `surface-2` background, `border` hairline; `chip--outlined`, `chip--primary` variants.
- **Buttons**: `.btn` quiet base; `.btn--primary` filled primary (ONE per view); `.btn--ghost` for the rest. Kills the red/blue button farm.
- **Recipe page**: meta as icon chips under title (clock total, prep, cook, servings stepper); two-column `1fr 2fr` with **thin vertical divider**, left column `position: sticky` ingredients (checkbox rows, grouped), steps as quiet numbered blocks without card boxes; cook-mode link as the primary CTA.
- **Section headers**: small caps label style, no emoji.

### 3.5 Page-by-page

| Page | Change |
|---|---|
| Home | Hero search row (full width of column), favorites chip, sort — kept; recents strip + collections row restyled quiet; grid → 3-col card standard |
| Recipe | Layout above; Cooklang source into quiet `<details>` |
| Shopping list | Mealie row pattern (checkbox → strike), sections as sticky mini-headers, toolbar (icon buttons) top-right |
| Planner | Week grid cards on `surface`, quiet header |
| Cook | Keep overlay (already good), re-skin colors to tokens |
| Tags/Collections | 3-col grid, quiet headers with counts |

## 4. What we deliberately do NOT copy

- **Accounts/menus for users/groups/spaces** (both) — no backend.
- **Density toggles, left-handed mode, per-user themes** (Tandoor) — single well-tuned default; theme light/dark only.
- **Material component sheen** (Vuetify elevation scales, ripples) — we keep a flatter, print-friendlier look while borrowing the spacing/alignment discipline.
- **Tandoor's 3-column content rails** — needs their feature density; our sidebar covers navigation.
