/**
 * Shopping list type definitions for type safety across the codebase.
 */

/**
 * Ingredient data structure for shopping list integration.
 * Represents a single ingredient that can be added to the shopping list.
 */
export interface RecipeIngredient {
  name: string;
  unit: string;
  baseQuantity: number;
}
