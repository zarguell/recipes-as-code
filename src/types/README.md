# Type Definitions

This directory contains centralized TypeScript type definitions for the codebase.

## Type Files

### `recipe.ts`
Recipe-related types:

- `StepItem` - Cooklang step item types
- `RecipeMetadata` - Recipe metadata from YAML frontmatter
- `FrontmatterResult` - Result from YAML parsing
- `Fraction` - Fraction representation for quantities

### `shopping-list.ts`
Shopping list types:

- `RecipeIngredient` - Ingredient data for shopping list

## Usage

Import types from this directory to ensure type safety across the codebase:

```typescript
import type { RecipeMetadata, StepItem } from '../../types/recipe.js';
import type { RecipeIngredient } from '../../types/shopping-list.js';
```

## Benefits

- **Centralized types** - Single source of truth for data structures
- **Type safety** - Catch errors at compile time
- **Documentation** - Types serve as inline documentation
- **Refactoring** - Easier to refactor when types are centralized
