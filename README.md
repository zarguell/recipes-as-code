# Recipe Collection & Management System as Code

A GitOps-first recipe management system that collects recipes from multiple sources (Instagram, TikTok, Pinterest, food blogs) and converts unstructured social media posts into structured, machine-readable Cooklang format. Automated pipelines build a static site and sync recipes to Tandoor for meal planning and cooking.

## Architecture Overview

### Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│ Recipe Sources (Unstructured)                                │
├─────────────────────────────────────────────────────────────┤
│ -  Instagram/TikTok posts (narrative text, emojis)           │
│ -  Pinterest boards (via Raindrop.io API)                    │
│ -  Food blogs (recipe cards with HTML)                       │
│ -  Raindrop.io bookmarks with full-text extraction           │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ n8n Automation Pipeline                                      │
├─────────────────────────────────────────────────────────────┤
│ 1. Fetch content via APIs/Karakeep                          │
│ 2. Extract recipe text, metadata, images                    │
│ 3. LiteLLM conversion → structured Cooklang                 │
│ 4. Validate syntax & commit to Git                          │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ Git Repository (Source of Truth)                            │
├─────────────────────────────────────────────────────────────┤
│ -  .cook files with YAML frontmatter                         │
│ -  Version controlled & human-editable                       │
│ -  Structured ingredients, cookware, timers                  │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ CI/CD Pipeline (GitHub Actions)                             │
├─────────────────────────────────────────────────────────────┤
│ -  Astro build → static HTML with custom layouts             │
│ -  Embed JSON-LD schema.org for recipe portability           │
│ -  Export schema.org JSON → Tandoor API import               │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ Output Targets                                               │
├─────────────────────────────────────────────────────────────┤
│ -  Astro static site (browsable recipes)                     │
│ -  Tandoor Recipes (cooking interface & meal planning)       │
│ -  JSON-LD embedded pages (importable to any app)            │
└─────────────────────────────────────────────────────────────┘
```

## Core Challenge: Unstructured to Structured

The primary goal of this system is to **transform difficult, unstructured social media posts into structured Cooklang code**. Social media recipes present unique challenges:

- Narrative prose with inconsistent formatting
- Ingredient quantities embedded in sentences
- Emojis and hashtags mixed with instructions
- Missing metadata (servings, cook time, source URL)
- Engagement text and promotional content

The LiteLLM-powered conversion pipeline addresses these challenges by using a specialized system prompt that enforces strict Cooklang syntax rules while preserving recipe accuracy.

## Technology Stack

| Component | Purpose |
|-----------|---------|
| **n8n** | Workflow automation & orchestration |
| **LiteLLM** | LLM proxy for AI-powered recipe conversion |
| **Karakeep** | Bookmark manager with full-text extraction & AI tagging |
| **Raindrop.io** | Bookmark syncing from Pinterest |
| **CookCLI** | Cooklang parser, validator & schema.org exporter  |
| **Astro** | Static site generator with custom page layouts  |
| **Tandoor Recipes** | Recipe management, meal planning, shopping lists |
| **Git/GitHub** | Version control & CI/CD orchestration |

## Repository Structure

```
recipes/
├── .github/
│   └── workflows/
│       └── build.yml              # CI/CD: Astro build & Tandoor sync
├── recipes/                        # Source of truth: .cook files
│   ├── 2025-12-01-vegan-caesar-pasta-salad.cook
│   ├── 2025-12-01-chocolate-chip-cookies.cook
│   └── ...
├── src/                            # Astro site source
│   ├── layouts/
│   │   └── RecipeLayout.astro     # Custom recipe page template
│   ├── pages/
│   │   └── [...slug].astro        # Dynamic recipe pages
│   └── components/
│       └── RecipeJsonLD.astro     # JSON-LD schema.org component
├── .gitignore
└── README.md
```

### File Naming Convention

**Format:** `YYYY-MM-DD-recipe-title.cook`

**Example:** `2025-12-01-vegan-caesar-pasta-salad.cook`

- Date prefix ensures chronological sorting
- Guarantees uniqueness (same recipe on different days creates separate files)
- Title is normalized: lowercase, spaces→hyphens, special characters removed

## Recipe Format (Cooklang)

Each `.cook` file uses YAML frontmatter followed by structured recipe instructions:

```cooklang
---
title: Chocolate Chip Cookies
servings: 24
prep-time: 15 minutes
cook-time: 12 minutes
source: https://instagram.com/p/abc123
tags: [dessert, cookies, baking, chocolate]
image: https://example.com/cookies.jpg
---

Preheat your #oven to 375°F. In a #large bowl{}, cream together @butter{1%cup, softened} and @brown sugar{1%cup} until fluffy, about ~{3%minutes}.

Beat in @eggs{2%large} and @vanilla extract{2%tsp} until well combined.

In a separate #bowl, whisk together @all-purpose flour{2.5%cups}, @baking soda{1%tsp}, and @salt{1%tsp}. Gradually mix the dry ingredients into the wet ingredients until just combined. Fold in @chocolate chips{2%cups}.

Drop rounded tablespoons of dough onto a #baking sheet{} lined with parchment paper, spacing them 2 inches apart. Bake for ~{10%minutes|12%minutes} until edges are golden. Cool on the baking sheet for ~{5%minutes} before transferring to a #cooling rack{}.

-- Store in airtight container for up to 1 week
```

### Cooklang Syntax Elements

| Element | Syntax | Example |
|---------|--------|---------|
| **Ingredient** | `@name{quantity%unit}` | `@flour{2%cups}` |
| **Cookware** | `#name{}` | `#mixing bowl{}` |
| **Timer** | `~{duration%unit}` | `~{30%minutes}` |
| **Comment** | `-- text` | `-- Best served warm` |
| **Section** | `== Name ==` | `== Frosting ==` |

### Metadata Fields

- `title`: Recipe name (auto-extracted by LLM)
- `servings`: Number of portions (default: 2)
- `prep-time`: Preparation duration
- `cook-time`: Cooking duration
- `source`: Original URL with tracking parameters removed
- `tags`: YAML array of tags from Karakeep AI
- `image`: Recipe image URL

## n8n LLM Conversion System Prompt

The following system prompt is used in all n8n LiteLLM API calls to ensure consistent, valid Cooklang output:

```
You are an expert at converting unstructured social media recipe posts into Cooklang format (.cook files).

EXAMPLE OF CORRECT COOKLANG FORMAT:

---
title: Chocolate Chip Cookies
servings: 24
prep-time: 15 minutes
cook-time: 12 minutes
---

Preheat your #oven to 375°F. In a #large bowl{}, cream together @butter{1%cup, softened} and @brown sugar{1%cup} until fluffy, about ~{3%minutes}.

Beat in @eggs{2%large} and @vanilla extract{2%tsp} until well combined.

In a separate #bowl, whisk together @all-purpose flour{2.5%cups}, @baking soda{1%tsp}, and @salt{1%tsp}. Gradually mix the dry ingredients into the wet ingredients until just combined. Fold in @chocolate chips{2%cups}.

Drop rounded tablespoons of dough onto a #baking sheet{} lined with parchment paper, spacing them 2 inches apart. Bake for ~{10%minutes|12%minutes} until edges are golden. Cool on the baking sheet for ~{5%minutes} before transferring to a #cooling rack{}.

-- Store in airtight container for up to 1 week

KEY RULES TO FOLLOW FROM THE EXAMPLE:
- Recipe starts with YAML frontmatter between --- delimiters
- Metadata uses YAML format (title:, servings:, prep_time:, cook_time:, tags:, source:, image:)
- Tags should be a YAML array: tags: [vegan, pasta, healthy]
- Instructions start after the closing ---
- Mark each ingredient with @ingredient{quantity%unit} when it's ADDED to the recipe
- If an ingredient is used in multiple stages (e.g., sugar in batter AND frosting), mark it separately each time: @sugar{1%cup} then later @sugar{0.25%cup}
- DO NOT add descriptive suffixes to ingredient names (@sugar{1%cup} NOT @sugar brownie{1%cup} or @sugar cream{1%cup})
- ALWAYS use spaces in ingredient/cookware names, NEVER underscores (@olive oil NOT @olive_oil, #baking sheet{} NOT #baking_sheet{})
- Every ingredient must have @ symbol before the name with its quantity
- Always use ONLY LOWERCASE letters for ingredients to ensure consistency
- Cookware marked with # and multi-word cookware needs {} at the end (#large bowl{})
- Timers marked with ~{duration%unit}
- Write as flowing paragraphs, not lists
- Comments at end with -- (only include if meaningful; omit empty comments)
- No separate ingredient sections
- Only use plain text references when mentioning something already added (e.g., "stir the sugar" after @sugar{1%cup} was already mixed in)
- Only mark purchased/raw ingredients with @, not intermediate preparations

STRUCTURE AND READABILITY:
- Break instructions into natural paragraphs grouped by cooking stage or task
- Use blank lines between paragraphs (\n\n) to separate distinct steps
- Follow logical temporal order (prep → cook → assemble)
- Keep related actions together in the same paragraph
- Simple recipes may need only 1-2 paragraphs; complex recipes may need 4-5
- Each paragraph should represent one major cooking phase
- DO NOT add filler or unnecessary detail just to create more paragraphs
- Prioritize clarity and natural reading flow over paragraph count

PARAGRAPH GUIDELINES:
- If the recipe has multiple simultaneous tasks (roasting + blending + cooking), use separate paragraphs
- If the recipe is linear with few steps, keep it in 1-2 paragraphs
- Break paragraphs when there's a natural pause or phase change in cooking

If quantities are missing from input, infer reasonable amounts for 2 servings.
Remove social media hashtags, comments, and engagement text.

OUTPUT: Only the .cook format recipe with proper paragraph breaks. No explanations.
```

### Prompt Design Rationale

- **Example-driven**: Shows complete valid output before rules
- **Strict syntax enforcement**: Prevents common errors (underscores, uppercase, malformed ingredients)
- **Paragraph guidance**: Balances readability with structural consistency
- **Noise filtering**: Explicitly removes social media artifacts
- **Inference capability**: Handles missing quantities with reasonable defaults

## n8n Automation Workflow

### Input Sources

1. **Instagram/TikTok**: Manual paste or scraping → LiteLLM conversion
2. **Pinterest**: Raindrop.io API → Karakeep bookmark extraction
3. **Food Blogs**: Karakeep full-text extraction → HTML parsing
4. **Direct bookmarks**: Karakeep integration with AI tagging

### LLM Configuration

- **System prompt**: Documented above (enforces Cooklang syntax)
- **User prompt**: Raw recipe text extracted from source
- **Model**: Configurable via LiteLLM (supports Gemini, GPT-4, Claude, etc.)
- **Temperature**: 0.2 (deterministic output)
- **Output validation**: CookCLI syntax check before commit

## Astro Static Site

The Astro build process generates a high-performance static site with custom recipe pages.

### Page Structure

Each recipe page includes:

- Custom layout with ingredient lists, instructions, and images
- JSON-LD schema.org `Recipe` markup embedded in `<script type="application/ld+json">`
- Tag filtering and search functionality
- Responsive design for mobile cooking

### JSON-LD Schema.org Implementation

Recipe pages embed structured data for portability and app import:

```json
{
  "@context": "https://schema.org",
  "@type": "Recipe",
  "name": "Vegan Caesar Pasta Salad",
  "author": {
    "@type": "Person",
    "name": "Recipe Collector"
  },
  "datePublished": "2025-12-01",
  "image": "https://example.com/pasta-salad.jpg",
  "description": "Creamy vegan Caesar dressing tossed with pasta...",
  "prepTime": "PT15M",
  "cookTime": "PT10M",
  "totalTime": "PT25M",
  "recipeYield": "4 servings",
  "recipeIngredient": [
    "2 cups pasta",
    "1 cup cashews",
    "2 tbsp lemon juice",
    "1 tsp garlic powder"
  ],
  "recipeInstructions": [
    {
      "@type": "HowToStep",
      "text": "Cook pasta according to package directions..."
    }
  ],
  "keywords": "vegan, pasta, salad, plant-based, healthy"
}
```

## Tag System

Tags are automatically generated by Karakeep AI and preserved throughout the pipeline:

- **Multi-dimensional**: `vegan`, `pasta`, `dinner`, `quick`, `high-protein`
- **Queryable**: Filter recipes via Astro site search
- **Synced to Tandoor**: Used for recipe categorization and filtering
- **Version controlled**: Tags stored in YAML frontmatter

***

## AI-Powered Recipe Linting

The first line prompt doesnt always work perfectly, so I'll run through the .cook files with Claude Code to get a second look at them across a number of rules.

### Linting Workflow

Run the AI linter periodically to:

- Normalize tags across recipes for better discoverability
- Validate cookware markup completeness
- Ensure all timers are properly tagged
- Verify ingredient markup accuracy
- Improve recipe narrative flow and readability

### Claude Code Linting Prompt

Use the following prompt in Claude Code to lint recipes in the `./recipes/*.cook` directory:

```
You are an expert Cooklang linter and recipe editor. Analyze all recipes in ./recipes/*.cook and improve them according to the Cooklang specification while maintaining recipe accuracy and readability.

LINTING TASKS:

1. TAG NORMALIZATION
   - Review frontmatter tags for consistency and relevance
   - Consolidate similar tags (e.g., "plant-based" and "plantbased" → "plant-based")
   - Remove irrelevant or overly generic tags (e.g., "food", "yummy", "delicious")
   - Use established categories: cuisine type, dietary restrictions, meal type, cooking method, main ingredient, difficulty, time commitment
   - Always use lowercase and hyphens for multi-word tags (e.g., "quick-meal", "dairy-free")
   - Limit to 5-8 meaningful tags per recipe

2. COOKWARE VALIDATION
   - Ensure all cookware is tagged with #cookware{} syntax
   - Examples: #loaf pan{}, #large skillet{}, #mixing bowl{}, #oven{}, #food processor{}
   - Remove cookware markup from non-equipment items (ingredients, techniques)
   - Add missing cookware tags where equipment is mentioned but not marked
   - Use consistent naming: #baking sheet{} NOT #sheet pan{} throughout all recipes
   - Always use spaces in multi-word cookware names, never underscores

3. TIMER VALIDATION
   - Tag all time durations with ~{duration%unit} syntax
   - Single timeframe: ~{70%minutes}
   - Range format: ~{25%minutes|30%minutes}
   - Ensure timers appear for: cooking times, resting periods, marinating, chilling, cooling
   - Convert ambiguous phrases ("until golden" → "for ~{12%minutes|15%minutes} until golden")

4. INGREDIENT VALIDATION
   - Verify all ingredients use @ingredient{quantity%unit} syntax
   - Ensure ingredient names are lowercase
   - Use spaces in multi-word ingredients: @olive oil{} NOT @olive_oil{}
   - Check quantity formats: @mascarpone{8%oz}, @garlic cloves{1-2%cloves, finely chopped}
   - Mark ingredients ONLY when first added, not when referenced later
   - Do not add descriptive suffixes: @butter{1%cup} NOT @butter softened{1%cup}
   - Validate that intermediate preparations are not marked (e.g., "the batter" should be plain text)

5. NARRATIVE AND FLOW
   - Ensure instructions follow logical temporal order: prep → cook → assemble → finish
   - Group related actions into cohesive paragraphs
   - Use blank lines (\n\n) to separate cooking phases
   - Remove redundant phrases and social media artifacts
   - Improve clarity without adding unnecessary verbosity
   - Maintain natural, flowing prose rather than bulleted lists
   - Ensure transitions between steps are smooth

CONSTRAINTS:
- Do NOT alter ingredient quantities or cooking techniques
- Do NOT change recipe titles in frontmatter
- Do NOT remove source URLs or image links
- Do NOT break Cooklang syntax rules
- Preserve the original recipe's intent and authenticity

OUTPUT:
For each recipe requiring changes, provide:
1. Filename
2. List of specific changes made
3. Updated .cook file content

For recipes that pass validation, simply note "No changes required."
```

### Running the Linter

```bash
# In Claude Code chat interface:
# 1. Open the repository workspace
# 2. Paste the linting prompt above
# 3. Review suggested changes before applying
# 4. Commit linted recipes with message: "chore: lint recipes for consistency"
```

### Post-Linting Validation

After AI linting, validate syntax with CookCLI:

```bash
cook validate recipes/*.cook
```

This ensures all changes maintain valid Cooklang syntax before committing to the repository.

**Maintained with ❤️ using GitOps principles**
