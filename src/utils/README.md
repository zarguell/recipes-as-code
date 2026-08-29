# Utilities

This directory contains utility functions used across the codebase.

## Structure

### Recipe Utilities
- `parse-recipe.ts` - Recipe file parsing (Phase 1)
- `recipe/metadata.ts` - Metadata parsing and JSON-LD generation (Phase 3)
- `recipe/scaling.ts` - Recipe quantity scaling (Phase 3)
- `recipe/shopping-list.ts` - Shopping list integration (Phase 3)
- `recipe/quantity-formatter.ts` - Fraction formatting (Phase 3)

### Shopping List Utilities
- `shopping-list/aggregator.ts` - Ingredient aggregation (Phase 2)
- `shopping-list/renderer.ts` - DOM element creation (Phase 2)

## Usage

Most utilities are imported by pages and components. See individual utility files for specific usage examples.

## Related Files

- `src/types/recipe.ts` - Recipe type definitions
- `src/types/shopping-list.ts` - Shopping list type definitions
