# 03 — Product Definition

## 1. Positioning

**A gorgeous, instant, offline-capable cookbook website generated from a Git repo of Cooklang files.**

- For people who keep recipes as text and want to share them (family, blog readers, the world) without running a server.
- Alternative to: Notion/Google-Docs recipe dumps (ugly, slow), WordPress+recipe-plugin (heavy), Mealie/Tandoor (great, but require hosting).
- Not an alternative to: recipe *management* systems. No write path. Git is the CMS.

Elevator sentence for the README:

> Your recipes live in Git. This turns them into a fast, installable, offline-capable cookbook — no server, no database, no accounts. Readers get cook mode, scaling, and a shopping list that works. You get `git push` as your publish button.

## 2. Personas

1. **The Author** (you / template users). Maintains `recipes/*.cook` in a repo. Needs: a documented frontmatter schema, validation that fails loudly with line numbers, a scaffolder, a URL importer (stretch). Success = publishing a recipe is `git push`.
2. **The Cook** (family member, partner). Phone in the kitchen. Needs: find recipe fast, scale servings, cook mode with timers, shopping list. Success = cooking from the site is *better* than cooking from a printed page.
3. **The Guest** (search engine / shared link). Lands on a recipe URL. Needs: instant render, structured data, no cookie walls, obvious path to the rest of the collection. Success = subscribes via RSS or bookmarks the site.

## 3. The frontmatter contract (the real "API")

Since files are the CMS, the metadata schema is the product surface for Authors. Standardize it (zod-validated, documented, versioned):

```yaml
---
title: Vanilla Pancakes        # required (fallback: filename)
description: One-bowl pancakes...
image: images/pancakes.jpg     # local (recommended) or remote URL
source: https://...            # canonical origin, rendered as link
tags: [breakfast, quick]       # free-form, slugified at build
category: breakfast            # exactly one (Mealie's category/tag split)
cuisine: american              # optional facet
servings: 4
prep-time: 10 min              # parsed to minutes; display localized
cook-time: 15 min
total-time: 25 min
date: 2026-02-01               # real pubDate for RSS/sorting
nutrition:                     # optional, display-only
  calories: 320
  protein: 9g
---
```

Validation errors (unknown keys warn, bad types fail) print file+key and fail CI. This single change converts "silent fallbacks everywhere" into a contract.

## 4. Feature set

### Tier 0 — Must work (the product is broken without these)
- Recipe index with search & filters; recipe page with correct quantities, scaling, tags, source.
- **Working shopping list** (add/remove, aggregated, grouped, check-off, persisted).
- Correct JSON-LD, RSS with real titles/dates, sitemap, canonical, OG tags, 404.
- Print stylesheet.

### Tier 1 — The experience (parity with what makes Mealie/Tandoor feel good)
- **Cook mode**: full-screen stepper, live timers, wake lock, check-off, works offline.
- Design system + responsive layout + dark mode without flash.
- Ingredient/step-body **full-text search** (Pagefind), tag/category pages with counts.
- Measurement preference (US fractions / metric), consistent fraction rendering.
- Shopping list v2: per-recipe grouping (Mealie-style expander), manual items, quantity edits, aisle grouping with **user override memory**, export (copy/CSV/JSON), undo everywhere.
- Image pipeline (responsive, optimized, offline-cacheable, designed placeholders).

### Tier 2 — Differentiators
- **Planner-lite**: localStorage week grid, drag recipes, "make shopping list from week".
- **Static collections** ("cookbooks"): named saved-filters in a config file (`collections.yml` → page each).
- Favorites + recently viewed (local).
- Share-list-via-URL; `npm run import <url>` CLI importer; authoring playground page (`/playground` live Cooklang → preview).
- Install-to-home-screen onboarding hint; recipe QR code for printing/sharing.

### Explicitly out of scope (see 02 §4)
Accounts, multi-user sync, write path, webhooks, server search, nutrition/price computation, AI.

## 5. Non-functional requirements

| Dimension | Target |
|---|---|
| Lighthouse (recipe page, mid-tier mobile) | ≥ 95 across the board |
| TTI on cold 3G | < 3 s (it's static HTML; this is about images/JS discipline) |
| Offline | Previously visited recipes + cook mode + shopping list fully functional offline |
| A11y | WCAG 2.1 AA; axe-clean in CI |
| Scale | 1,000 recipes: build < 5 min; search via Pagefind chunks; paginated/collection-browsable index |
| Content safety | Recipe files are untrusted input: no innerHTML/set:html of content anywhere |
| Browser support | Last 2 versions evergreen + Safari iOS n-2 (wake lock/notifications guarded) |

## 6. What we are NOT building

Repeat for the back row: there is no server, no login, no write, no sync. Any feature proposal that requires state to survive the user's browser gets redesigned around export/import or a URL, or it doesn't get built.
