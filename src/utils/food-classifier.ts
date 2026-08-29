/**
 * FoodClassifier - Classifies ingredients into grocery store categories
 *
 * Loads food classification data from JSON and provides methods to:
 * - Normalize ingredient names (remove quantities, units, descriptors)
 * - Classify ingredients by category (Produce, Dairy, Meat, etc.)
 * - Group ingredients by category for organized display
 */

/**
 * Normalize an ingredient name by stripping quantities, units and
 * preparation descriptors. Pure function — safe to call from anywhere
 * (build time, tests, client) with no classifier instance.
 */
export function normalizeIngredientName(ingredientName: string): string {
  if (!ingredientName) return '';

  let normalized = ingredientName.toLowerCase().trim();

  normalized = normalized.replace(/^[\d\s\/]*\s*([a-z]*)\s*/, '');

  const units = ['tsp', 'tbsp', 'cup', 'cups', 'oz', 'lb', 'lbs', 'gram', 'grams', 'g', 'kg', 'ml', 'l', 'pinch', 'dash', 'clove', 'cloves'];
  units.forEach(unit => {
    const regex = new RegExp(`\\b${unit}\\b`, 'g');
    normalized = normalized.replace(regex, '');
  });

  normalized = normalized.replace(/\([^)]*\)/g, '');

  const descriptors = ['grated', 'chopped', 'diced', 'minced', 'finely', 'roughly', 'fresh', 'dried', 'ground', 'crushed', 'sliced', 'whole', 'large', 'small', 'medium', 'extra', 'virgin'];
  descriptors.forEach(descriptor => {
    const regex = new RegExp(`\\b${descriptor}\\b`, 'g');
    normalized = normalized.replace(regex, '');
  });

  normalized = normalized.replace(/\s+/g, ' ').trim();

  return normalized;
}

export class FoodClassifier {
  classificationData: any = null;

  /**
   * Load food classification data from JSON file.
   *
   * Fetches classification data from the server including sections, rules,
   * and overrides. Data is required for classification to work.
   *
   * The promise resolves (not rejects) even on failure so callers can
   * simply `await classifier.loadData()` — classification then falls back
   * to the "Other" bucket.
   *
   * @example
   * const classifier = new FoodClassifier();
   * await classifier.loadData();
   * classifier.classifyIngredient("tomatoes");
   */
  async loadData(): Promise<void> {
    try {
      const response = await fetch(`${import.meta.env.BASE_URL}static/food-classification.json`);
      this.classificationData = await response.json();
    } catch (error) {
      console.error('Failed to load food classification data:', error);
      this.classificationData = { sections: [], overrides: {}, rules: [] };
    }
  }

  /**
   * Normalize ingredient name. Delegates to the shared pure function.
   *
   * @param ingredientName - Raw ingredient name (e.g., "2 cups chopped onions")
   * @returns Normalized ingredient name (e.g., "onions")
   */
  normalizeIngredient(ingredientName: string): string {
    return normalizeIngredientName(ingredientName);
  }

  /**
   * Classify an ingredient into a grocery store category.
   *
   * Uses classification data to determine which category an ingredient belongs to.
   * Checks overrides first, then applies matching rules based on keywords.
   *
   * @param ingredientName - Raw ingredient name to classify
   * @returns Category name (e.g., "Produce", "Dairy", "Meat") or "Other"
   *
   * @example
   * classifyIngredient("tomatoes")
   * // Returns: "Produce"
   *
   * @example
   * classifyIngredient("chicken breast")
   * // Returns: "Meat"
   */
  classifyIngredient(ingredientName: string) {
    if (!this.classificationData) return 'Other';

    const normalized = this.normalizeIngredient(ingredientName);

    if (this.classificationData.overrides[normalized]) {
      return this.classificationData.overrides[normalized];
    }

    for (const rule of this.classificationData.rules) {
      for (const keyword of rule.contains) {
        if (normalized.includes(keyword)) {
          return rule.section;
        }
      }
    }

    return 'Other';
  }

  /**
   * Group array of ingredients by their grocery store categories.
   *
   * Organizes ingredients into sections (Produce, Dairy, Meat, etc.) for
   * organized display. Empty sections are removed from the result.
   *
   * @param ingredients - Array of ingredient objects with `name` property
   * @returns Object mapping category names to arrays of ingredients
   *
   * @example
   * groupIngredientsByCategory([
   *   { name: "tomatoes", quantity: "2 cups" },
   *   { name: "milk", quantity: "1 cup" }
   * ])
   * // Returns: {
   * //   "Produce": [{ name: "tomatoes", quantity: "2 cups" }],
   * //   "Dairy": [{ name: "milk", quantity: "1 cup" }]
   * // }
   */
  groupIngredientsByCategory(ingredients: any[]) {
    if (!this.classificationData) {
      return { 'Other': ingredients };
    }

    const grouped: any = {};

    this.classificationData.sections.forEach((section: string) => {
      grouped[section] = [];
    });

    ingredients.forEach((ingredient: any) => {
      const category = this.classifyIngredient(ingredient.name);
      if (grouped[category]) {
        grouped[category].push(ingredient);
      } else {
        grouped['Other'].push(ingredient);
      }
    });

    Object.keys(grouped).forEach((section: string) => {
      if (grouped[section].length === 0) {
        delete grouped[section];
      }
    });

    return grouped;
  }
}
