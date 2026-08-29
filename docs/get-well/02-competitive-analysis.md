# 02 — Competitive Analysis: Mealie & Tandoor

Both are excellent, mature, *server* applications (Mealie: FastAPI + Vue; Tandoor: Django + Vue). We cannot and should not copy them wholesale — no backend means no accounts, no write path, no server-side sync or scraping. But they define user expectations for recipe software, and most of what makes them feel good is **client-side state + information architecture**, both of which a static site can have. This doc separates *what to adopt*, *what to adapt*, and *what to skip*.

Sources: docs.mealie.io (Features), docs.tandoor.dev (Features: Shopping, Import/Export, Automation), tandoor.dev, demo walkthroughs, both GitHub READMEs.

---

## 1. What they are

| | Mealie | Tandoor | Ours (today) |
|---|---|---|---|
| Model | Self-hosted, multi-user (Groups→Households) | Self-hosted/hosted, Spaces, sharing | Static, public, single-publisher |
| Recipe source | DB + scraper/editor | DB + scraper/editor | `.cook` files in Git |
| Killer strengths | Scraper + AI import, meal planner, polish | Search (FTS + trigram), automation, power-user depth | Zero ops, instant pages, Cooklang-native |
| Shopping list | Labels (aisle-ish), linked recipes, check-off, reorder | Supermarket category ordering, autosync between users, export | Broken in production |
| Cooking UX | Step view, step/ingredient check-off | Step-focused view, fractions/decimals, print views | Static steps + decorative timers |

## 2. Feature-by-feature verdict

### Adopt (fully compatible with static; high user value)

1. **Cook mode / step-focused cooking view.** Mealie and Tandoor both de-emphasize everything except the current step while cooking. This is the single most-missed feature in our UI. All client-side: full-screen stepper, big type, check-off, **real countdown timers** (our timers are decorative text today), screen wake-lock, per-recipe state persistence. *This is our #1 feature to build.*
2. **Aisle/section-grouped shopping lists.** Tandoor's "supermarket ordering" and Mealie's "labels" are the same idea: group items by store section, remember user corrections. We already invented this (`food-classifier.ts` + `food-classification.json`) but run it *at runtime, broken*. Move it to **build time**: classification ships baked into the page; localStorage remembers user overrides. Adopt Mealie's check-off persistence + "linked recipes" expander.
3. **Scaling everywhere, consistently.** Both scale servings and re-derive every quantity. We scale (well!) but only the ingredient list + step chips, with two different formatting conventions. Adopt the *stepper* (− / 2 / +) pattern rather than a bare number input.
4. **Powerful findability.** Tandoor's calling card is search (full-text, trigram, tag facets); Mealie's is faceted organizers (categories / tags / tools / cookbooks). Static equivalents: **Pagefind** (build-time index; searches ingredient text and step bodies, not just titles) + build-time taxonomy pages with counts + static "collections" (their "cookbooks" = saved filters, trivially a config file for us).
5. **Print views.** Tandoor explicitly ships printing views. Our print CSS is an afterthought that hides buttons. A dedicated print layout (photo, scaled ingredients, checklist, no chrome) is cheap and loved.
6. **Mobile-first + PWA.** Both optimize hard for phone-in-kitchen use. We have PWA plumbing; we need the interaction design (big touch targets, sticky "cook" CTA, landscape support) and real offline (runtime caching of visited recipes + full cook mode offline).
7. **Fractions/decimals display preference.** Tandoor supports both. One client preference, one formatter module — we already have the hard parts.

### Adapt (re-imagine for static)

8. **Meal planning.** Mealie's planner is calendar + rules; Tandoor plans meals and generates shopping lists from the plan. Static adaptation: a **localStorage week planner** (drag recipes onto 7 slots, one household, no sync) with "generate shopping list from week" — the aggregation engine is already our domain model. No rules engine, no webhooks. This is a differentiator: no static recipe site does this well.
9. **Import from URL.** Both scrape schema.org Recipe at runtime. Static adaptation: a **build-time/CLI importer** (`npm run import <url>` → writes a `.cook` file into the repo) — the author's machine does the fetching; CI just builds. Preserves the Git-as-CMS purity.
10. **Export/share.** Tandoor exports lists to other apps; Mealie has bulk exports. Static adaptations: shopping-list export (copy-as-text / CSV / JSON download — all client-side), share-list-via-URL (list serialized+compressed into the hash; recipient sees a read-only static page), recipe share is just… the URL.
11. **Undo & non-destructive UX.** Tandoor marks lists "finished" (hidden not deleted); Mealie lets you uncheck and restore. Ours: every destructive action gets client-side undo (trivial when state is local). Replace all `confirm()`s.

### Skip (server-bound; explicitly out of scope)

12. Accounts, groups/households, permissions, real-time sync, share-with-users (Tandoor autosync) — **the point of this project is no server**. The static substitute is: public site + local state + export/import + share-links.
13. In-browser recipe editor with validation-on-save (both) — files in Git *are* the editor. Substitute: a schema-documented frontmatter standard, a `new-recipe` scaffolder script, build-time validation with human-readable errors, and (stretch) an authoring playground page.
14. Webhooks/notifiers/automation/Home-Assistant — server-side by nature.
15. AI import (Mealie), AI features (Tandoor) — keep out of the site; could live in the CLI importer later.
16. Nutrition calculation, price/points calculation (Tandoor) — display-only if the author frontmatter provides it; never compute.

## 3. UI/UX patterns worth stealing (with provenance)

- **Card grid with consistent image ratio** (both): fixed 4:3 or 16:10 media box, title, meta chips (time, servings). Kills the visual noise our free-form cards have. Empty images get a designed placeholder, not "🍳 No Image".
- **Left sidebar / persistent global nav** (Mealie desktop, Tandoor top-nav): Recipes · Collections · Tags · Planner · Shopping. We currently navigate via buttons *inside the page content*; there is no chrome at all.
- **Search-first home** (Tandoor): big search box above the grid, facets below. Our home has a small search box and a button farm.
- **Recipe page = two columns** (both): sticky ingredient panel left (check-off + scale), instructions right (current-step emphasis). This is the de-facto standard; our layout has the right bones but no stickiness, no cook-mode, and emoji section headers.
- **Meta as chips, not cards** (Mealie): time/servings as compact inline chips with icons, not four gray boxes with uppercase labels.
- **"Add to shopping list" lives in two places** (both): a primary action near the title *and* per-ingredient rows. Ours has one button that adds everything.
- **Alphabetical/random/filters toolbar** (Mealie): sort + filter chips above grid; count of results.
- **Tag/category pages show counts and a lead image** (both).
- **Empty states that teach** (Mealie): empty shopping list explains how to fill it and links recipes — ours does this already (good), keep it.
- **Keyboard shortcuts & command palette** (Tandoor power users): `/` to focus search, `j/k` lists — stretch goal, cheap with Pagefind's UI.

## 4. Where we win already (lean in)

1. **Instant, free, zero-infra hosting** — GitHub Pages vs. their Docker/VPS/managed pricing tiers. This is the pitch.
2. **Cooklang-native**: canonical, diff-able, portable recipe source *displayed and downloadable per recipe*. Neither competitor exposes the source format like this.
3. **Git-as-CMS**: recipes are versioned, reviewable, forkable. Mealie/Tandoor bolt export/import on; we're born in text.
4. **Privacy as architecture**: no server, no cookies, no accounts — user state never leaves the browser. Tandoor leads with "no tracking"; we can make it structural.
5. **Speed**: pre-rendered MPAs with no framework runtime will outrank and out-load both incumbents' Vue SPAs on cold loads.

## 5. Strategic takeaway

Don't build a worse Mealie. Build the **read-only, offline-capable, Git-backed cookbook** that a family actually shares: instant pages, gorgeous cook mode, a shopping list that finally works, planner-lite — with every dynamic feature satisfied by local state instead of a server. Every "adopt" above is build-time data + localStorage. Every "skip" is a server. The line between them *is* the product strategy.
