/**
 * Recipe metadata utilities for parsing and schema generation.
 * Handles YAML frontmatter extraction and JSON-LD schema generation.
 */

import { extractSteps, resolveSteps } from '../lib/recipes';

/**
 * Step item types in Cooklang format.
 */
export interface StepItem {
  type: string;
  value?: any;
  displayName?: string;
  name?: string;
}

/**
 * Recipe metadata structure.
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
 * Extract text from step items for JSON-LD representation.
 *
 * Handles various step item types: text, ingredient, cookware, timer.
 * Converts each item type to its human-readable text representation.
 *
 * @param items - Array of step items from Cooklang parser
 * @param cookwareList - Array of cookware items indexed by numeric position
 * @param timersList - Array of timer items indexed by numeric position
 * @returns Text representation of the step
 */
export function getStepText(
  items: StepItem[],
  cookwareList: any[],
  timersList: any[]
): string {
  if (!items || items.length === 0) return "";

  // Token indexes are resolved via the shared helpers in lib/recipes.ts
  // (the parser emits { index } references — using item.value silently
  // breaks cookware/timer text).
  const index = (item: any) => item?.value ?? item?.index;
  const fixedNumber = (quantity: any): number | null => {
    if (typeof quantity === "number") return Number.isFinite(quantity) ? quantity : null;
    if (quantity?.type !== "fixed") return null;
    const v = quantity.value;
    if (v?.type === "decimal" && typeof v.value === "number") return v.value;
    if (v?.type === "fraction" && typeof v.num === "number" && typeof v.den === "number" && v.den !== 0) {
      return v.num / v.den;
    }
    return null;
  };

  return items
    .map((item) => {
      if (!item) return "";

      if (item.type === "text") {
        const value = item?.value;
        if (value == null) return "";
        if (Array.isArray(value)) {
          return value.filter((v) => v != null).join(" ");
        }
        return String(value);
      }

      if (item.type === "ingredient") {
        return item.displayName || "";
      }

      if (item.type === "cookware") {
        const idx = index(item);
        return (typeof idx === "number" ? cookwareList[idx]?.name : undefined) || "cookware";
      }

      if (item.type === "timer") {
        const idx = index(item);
        const timerItem = typeof idx === "number" ? timersList[idx] : undefined;
        const quantity = fixedNumber(timerItem?.duration);
        if (quantity === null) return "timer";
        let unit = timerItem?.unit || "minutes";
        if (typeof unit === "string" && unit.includes("|")) unit = unit.split("|")[0];
        return `${quantity} ${unit}`;
      }

      return "";
    })
    .join("")
    .trim();
}

/**
 * Generate JSON-LD schema for search engine optimization.
 *
 * Creates a Recipe schema.org structure with all relevant metadata,
 * ingredients, and instructions for structured data.
 *
 * @param metadata - Recipe metadata object
 * @param imageUrl - Recipe image URL
 * @param tags - Array of tags
 * @param source - Source URL
 * @param ingredients - Array of ingredients
 * @param steps - Array of step items
 * @param cookwareList - Map of cookware items
 * @param timersList - Map of timer items
 * @returns JSON-LD schema object
 *
 * @example
 * const schema = generateJsonLdSchema(
 *   { title: 'Pasta', servings: 4 },
 *   '/images/pasta.jpg',
 *   ['dinner', 'quick'],
 *   'https://example.com/recipe',
 *   [{ name: 'flour', quantity: { value: { value: 2 } } }],
 *   stepItems,
 *   cookwareMap,
 *   timerMap
 * )
 */
export function generateJsonLdSchema(
  metadata: RecipeMetadata,
  imageUrl: string | null,
  tags: string[],
  source: string | undefined,
  ingredients: any[],
  steps: any[],
  cookwareList: any[],
  timersList: any[]
): Record<string, any> {
  return {
    "@context": "https://schema.org/",
    "@type": "Recipe",
    name: metadata.title || "",
    description: metadata.description || "",
    image: imageUrl,
    prepTime: metadata["prep-time"] ? `PT${metadata["prep-time"]}` : null,
    cookTime: metadata["cook-time"] ? `PT${metadata["cook-time"]}` : null,
    totalTime: metadata["total-time"] ? `PT${metadata["total-time"]}` : null,
    recipeYield: metadata.servings || null,
    recipeCategory: metadata.category || null,
    recipeCuisine: metadata.cuisine || null,
    keywords: tags.join(", "),
    author: { "@type": "Person", name: metadata.author || "Unknown" },
    recipeIngredient: ingredients.map((ing) => {
      let str = ing.name || "";
      if (ing.quantity?.value?.value !== undefined) {
        const qty = ing.quantity.value.value;
        str = `${qty}${ing.unit ? ` ${ing.unit}` : ""} ${str}`;
      }
      return str;
    }),
    recipeInstructions: steps
      .filter((step) => step && step.items)
      .map((step: any, idx: number) => ({
        "@type": "HowToStep",
        position: idx + 1,
        // cookware/timers MUST be forwarded — the guard in getStepText
        // returns "" for every step without them (shipped empty
        // instructions for months).
        text: getStepText(step.items || [], cookwareList, timersList),
      })),
  };
}

/**
 * Build a complete JSON-LD Recipe object from a loaded recipe.
 * Convenience wrapper so pages don't hand-thread eight arguments.
 */
export function buildRecipeJsonLd(loaded: {
  slug: string;
  title: string;
  parsed: any;
}): Record<string, any> {
  const parsed = loaded.parsed ?? {};
  const metadata = parsed.metadata ?? {};
  const ingredients = parsed.ingredients ?? [];
  const cookwareList = parsed.cookware ?? [];
  const timersList = parsed.timers ?? [];
  const steps = extractSteps(parsed);

  const imageUrl = metadata.image?.replace(/^["']|["']$/g, "") || null;
  const tags: string[] = metadata.tags || [];

  const schema = generateJsonLdSchema(
    metadata,
    imageUrl,
    tags,
    metadata.source,
    ingredients,
    steps,
    cookwareList,
    timersList
  );

  // Guard against silently shipping empty instructions again.
  const withText = schema.recipeInstructions.filter((s: any) => s.text?.trim());
  if (steps.length > 0 && withText.length === 0) {
    console.warn(`JSON-LD: recipe "${loaded.slug}" produced no instruction text`);
  }

  return schema;
}
