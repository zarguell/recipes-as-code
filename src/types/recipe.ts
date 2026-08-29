/**
 * Recipe type definitions for type safety across the codebase.
 */

/**
 * Step item types in Cooklang format.
 * Represents different item types that can appear in recipe steps.
 */
export interface StepItem {
  type: string;
  value?: any;
  displayName?: string;
  name?: string;
}

/**
 * Recipe metadata structure from YAML frontmatter.
 * All fields are optional as recipes may have varying metadata.
 */
export interface RecipeMetadata {
  title?: string;
  description?: string;
  image?: string;
  source?: string;
  "prep-time"?: string;
  "cook-time"?: string;
  "total-time"?: string;
  servings?: number;
  category?: string;
  cuisine?: string;
  tags?: string[];
  author?: string;
}

/**
 * Frontmatter extraction result from YAML parsing.
 * Contains both the parsed metadata and the remaining recipe content.
 */
export interface FrontmatterResult {
  frontmatter: RecipeMetadata;
  recipeContent: string;
}

/**
 * Fraction representation with whole number and fractional parts.
 * Used for quantity formatting in recipes.
 */
export interface Fraction {
  whole: number;
  num: number;
  den: number;
}
