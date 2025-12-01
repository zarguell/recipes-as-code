# Recipe Collection & Management System as Code

A GitOps-first recipe management system that collects recipes from multiple sources (Instagram, TikTok, Pinterest, food blogs) and stores them in human-readable Cooklang format. Automated pipelines convert recipes to various formats and sync to Tandoor for meal planning and cooking.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│ Recipe Sources                                               │
├─────────────────────────────────────────────────────────────┤
│ -  Instagram/TikTok posts (unstructured text)                │
│ -  Pinterest boards (via API)                                 │
│ -  Food blogs (recipe cards)                                  │
│ -  Raindrop.io bookmarks                                      │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ n8n Automation Pipeline                                      │
├─────────────────────────────────────────────────────────────┤
│ 1. Fetch content (via APIs/Karakeep)                        │
│ 2. Extract recipe text & metadata                           │
│ 3. LLM conversion → Cooklang format                         │
│ 4. Commit to Git repository                                 │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ Git Repository (Source of Truth)                            │
├─────────────────────────────────────────────────────────────┤
│ -  .cook files with structured metadata                      │
│ -  Version controlled & auditable                            │
│ -  Human-readable & editable                                 │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ CI/CD Pipeline (GitHub Actions)                             │
├─────────────────────────────────────────────────────────────┤
│ -  CookCLI export → schema.org JSON                          │
│ -  Static site generation → Markdown/HTML                    │
│ -  Trigger Tandoor import via API                            │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ Tandoor Recipes (Consumption Layer)                         │
├─────────────────────────────────────────────────────────────┤
│ -  Cooking interface                                          │
│ -  Meal planning                                              │
│ -  Shopping list generation                                   │
└─────────────────────────────────────────────────────────────┘
```

## Technology Stack

- **n8n**: Workflow automation & orchestration
- **LiteLLM**: LLM proxy for recipe text → Cooklang conversion
- **Karakeep**: Bookmark manager with full-text extraction & AI tagging
- **Raindrop.io**: Bookmark syncing from Pinterest
- **CookCLI**: Cooklang parser & exporter
- **Tandoor Recipes**: Recipe management & meal planning
- **Git/GitHub**: Version control & CI/CD

## Repository Structure

```
recipes/
├── .github/
│   └── workflows/
│       └── build.yml              # CI/CD: export & sync on commits
├── recipes/                        # Source of truth: .cook files
│   ├── 2025-12-01-vegan-caesar-pasta-salad.cook
│   ├── 2025-12-01-chocolate-chip-cookies.cook
│   └── ...
├── generated/                      # CI/CD outputs (gitignored)
│   ├── schema-org/                 # For Tandoor import
│   ├── markdown/                   # For static site
│   └── by-tag/                     # Organized by tags
├── scripts/
│   ├── export-schema-org.sh        # CookCLI wrapper scripts
│   └── export-markdown.sh
├── .gitignore
└── README.md
```

### File Naming Convention

**Format:** `YYYY-MM-DD-recipe-title.cook`

**Example:** `2025-12-01-vegan-caesar-pasta-salad.cook`

- Date prefix ensures chronological sorting
- Guarantees uniqueness (same recipe on different days = different files)
- Title is normalized: lowercase, spaces→hyphens, special chars removed

## Recipe Format (Cooklang)

Each `.cook` file contains:

```
>> Recipe Title
>> servings: 4
>> prep time: 15 minutes
>> cook time: 30 minutes
>> source: https://instagram.com/p/abc123
>> tags: vegan, pasta, salad, plant-based, healthy
>> image: https://example.com/image.jpg

Preheat your #oven to 400°F. Toss @chickpeas{2%cups} with @salt{½%tsp}...

[Natural language instructions with inline markup]

-- Optional comments or storage tips
```

### Metadata Fields

- `servings`: Number of portions
- `prep time`: Preparation duration
- `cook time`: Cooking duration
- `source`: Original URL (cleaned of tracking params)
- `tags`: Comma-separated tags from Karakeep AI
- `image`: Recipe image URL

## n8n Automation Workflow

### Input Sources

1. **Instagram/TikTok**: Manual input or scraping → LiteLLM conversion
2. **Pinterest**: API → Raindrop.io → Karakeep
3. **Food Blogs**: Karakeep → extract URL & HTML
4. **Direct bookmarks**: Karakeep integration

### Processing Steps

```
1. Trigger (webhook, schedule, or manual)
   ↓
2. Fetch recipe data from Karakeep
   ↓
3. Extract: text, URL, tags, image
   ↓
4. LiteLLM API call with Cooklang system prompt
   ↓
5. Append metadata (source, tags, image)
   ↓
6. Generate filename: {date}-{normalized-title}.cook
   ↓
7. Git commit & push to repository
   ↓
8. [Optional] Trigger CI/CD or direct Tandoor import
```

### LLM Prompt Strategy

- **System prompt**: Cooklang format rules + example recipe
- **User prompt**: Raw recipe text from social media/blogs
- **Model**: Configurable via LiteLLM (Gemini, GPT, Claude, etc.)
- **Output**: Valid `.cook` file with proper syntax

## CI/CD Pipeline

### Triggers

- Git push to `recipes/*.cook` files
- Manual workflow dispatch

### Jobs

1. **Validate**: Parse all `.cook` files with CookCLI
2. **Export**: Generate schema.org JSON for each recipe
3. **Generate**: Create markdown/HTML for static site
4. **Sync**: POST schema.org to Tandoor API endpoint
5. **Organize**: Create tag-based views in `generated/by-tag/`

### Example Workflow

```
on:
  push:
    paths:
      - 'recipes/**/*.cook'

jobs:
  export:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install CookCLI
        run: # install steps
      - name: Export to schema.org
        run: bash scripts/export-schema-org.sh
      - name: Trigger Tandoor import
        run: curl -X POST $TANDOOR_WEBHOOK
```

## Tandoor Integration

### Import Methods

**Option 1: Direct API (Recommended)**
- n8n POSTs schema.org JSON to `/api/recipe-from-source/`
- Uses `data` parameter with exported schema.org from CookCLI

**Option 2: CI/CD Webhook**
- GitHub Actions triggers n8n webhook after export
- Batch import multiple recipes

**Option 3: Manual**
- Export individual recipes and import via Tandoor UI

### Tandoor Usage

Once imported:
- View recipes in web/mobile interface
- Plan weekly meals
- Generate shopping lists with aggregated ingredients
- Scale recipes & track nutrition

## Tag System

Tags are automatically generated by Karakeep AI and preserved in recipe metadata:

- Multi-dimensional (e.g., `vegan`, `pasta`, `dinner`, `quick`)
- Queryable via CookCLI or static site
- Used by CI/CD to organize `generated/by-tag/`
- Synced to Tandoor for filtering

## Local Development

### Prerequisites

```
# Install CookCLI
brew install cooklang/tap/cook  # macOS
# or download from https://cooklang.org/cli/

# Clone repository
git clone https://github.com/yourusername/recipes.git
cd recipes
```

### Adding Recipes Manually

```
# Create new recipe
vim recipes/$(date +%Y-%m-%d)-my-recipe.cook

# Validate syntax
cook recipe recipes/$(date +%Y-%m-%d)-my-recipe.cook

# Export to schema.org
cook recipe export --format json recipes/$(date +%Y-%m-%d)-my-recipe.cook

# Commit
git add recipes/
git commit -m "Add: my-recipe"
git push
```

### Testing Exports

```
# Export all recipes to schema.org
bash scripts/export-schema-org.sh

# Generate markdown site
bash scripts/export-markdown.sh

# Check generated files
ls -lh generated/schema-org/
```

## Future Enhancements

- [ ] Cooklang federation support (public recipe sharing)
- [ ] Recipe search via CLI/web interface
- [ ] Nutrition calculation automation
- [ ] Recipe versioning & changelog
- [ ] Multi-language recipe support
- [ ] Integration with grocery delivery APIs
- [ ] Recipe rating & notes system
- [ ] Automatic ingredient substitution suggestions

## Contributing

This is a personal recipe collection, but the automation patterns are reusable:

1. Fork the repository
2. Adapt the n8n workflows to your sources
3. Customize the LLM prompts for your recipe format preferences
4. Configure CI/CD for your hosting setup

## License

Recipes are personal content. Automation code is MIT licensed.

---

**Maintained with ❤️ using GitOps principles**
