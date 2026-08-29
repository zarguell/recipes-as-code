/**
 * Shopping list persistence.
 *
 * The single source of truth for the user's shopping list. Imported
 * directly by the recipe pages and the shopping-list page — no
 * window.* globals anywhere.
 *
 * Storage format is unchanged from the legacy Layout.astro
 * implementation (key: "recipe-shopping-list") so existing user lists
 * survive the refactor. Malformed/corrupted data resets to an empty
 * list instead of throwing.
 */

export interface StoredIngredient {
  name: string;
  unit: string;
  baseQuantity: number | null;
}

export interface StoredRecipe {
  slug: string;
  title: string;
  ingredients: StoredIngredient[];
  addedAt: string;
}

export interface ShoppingListData {
  recipes: StoredRecipe[];
  /** Keys (normalized "name unit qty") of checked aggregated ingredients. */
  checkedIngredients?: string[];
}

const STORAGE_KEY = "recipe-shopping-list";

function isValidRecipe(value: any): value is StoredRecipe {
  return (
    value &&
    typeof value.slug === "string" &&
    typeof value.title === "string" &&
    Array.isArray(value.ingredients)
  );
}

/** Stable key for an aggregated ingredient line (checked-state identity). */
export function ingredientKey(name: string, unit: string, qty: number | null): string {
  return `${name}|${unit}|${qty === null ? "" : qty}`;
}

export class ShoppingList {
  private storageKey = STORAGE_KEY;
  list: ShoppingListData;

  constructor() {
    this.list = this.loadList();
  }

  loadList(): ShoppingListData {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (!stored) return { recipes: [] };
      const data = JSON.parse(stored);
      if (!data || !Array.isArray(data.recipes)) return { recipes: [] };
      // Drop malformed entries, keep the rest of an otherwise-valid list.
      const recipes = data.recipes.filter(isValidRecipe);
      const checkedIngredients = Array.isArray(data.checkedIngredients)
        ? data.checkedIngredients.filter((k: unknown) => typeof k === "string")
        : [];
      return { recipes, checkedIngredients };
    } catch (e) {
      console.error("Ignoring corrupted shopping list in localStorage:", e);
      return { recipes: [] };
    }
  }

  saveList(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.list));
    } catch (e) {
      console.error("Could not persist shopping list:", e);
    }
  }

  /**
   * Toggle a recipe on the list. Returns true when the recipe was
   * removed (it was already present), false when it was added.
   */
  addRecipe(
    recipeSlug: string,
    recipeTitle: string,
    ingredients: StoredIngredient[]
  ): boolean {
    const existingIndex = this.list.recipes.findIndex((r) => r.slug === recipeSlug);

    if (existingIndex >= 0) {
      this.list.recipes.splice(existingIndex, 1);
    } else {
      this.list.recipes.push({
        slug: recipeSlug,
        title: recipeTitle,
        ingredients,
        addedAt: new Date().toISOString(),
      });
    }

    this.saveList();
    return existingIndex >= 0;
  }

  removeRecipe(recipeSlug: string): void {
    this.list.recipes = this.list.recipes.filter((r) => r.slug !== recipeSlug);
    this.saveList();
  }

  clearAll(): void {
    this.list = { recipes: [], checkedIngredients: [] };
    this.saveList();
  }

  /** Replace the entire list (import / undo). Validates before applying. */
  replaceAll(data: ShoppingListData): boolean {
    if (!data || !Array.isArray(data.recipes) || !data.recipes.every(isValidRecipe)) {
      return false;
    }
    this.list = {
      recipes: data.recipes,
      checkedIngredients: Array.isArray(data.checkedIngredients)
        ? data.checkedIngredients.filter((k) => typeof k === "string")
        : [],
    };
    this.saveList();
    return true;
  }

  toggleIngredientChecked(key: string, checked: boolean): void {
    const set = new Set(this.list.checkedIngredients ?? []);
    if (checked) set.add(key);
    else set.delete(key);
    this.list.checkedIngredients = Array.from(set);
    this.saveList();
  }

  isIngredientChecked(key: string): boolean {
    return (this.list.checkedIngredients ?? []).includes(key);
  }

  isRecipeInList(recipeSlug: string): boolean {
    return this.list.recipes.some((r) => r.slug === recipeSlug);
  }
}

/** Shared singleton. */
export const shoppingList = new ShoppingList();
