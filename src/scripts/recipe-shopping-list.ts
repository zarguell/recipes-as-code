/**
 * Shopping list integration utilities for recipe pages.
 * Handles extracting ingredients from recipe pages and adding them to the shopping list.
 */

import { shoppingList } from './shopping-list-store';

/**
 * Ingredient data structure for shopping list integration.
 */
export interface RecipeIngredient {
  name: string;
  unit: string;
  baseQuantity: number;
}

/**
 * Extract ingredients from the recipe page for shopping list integration.
 *
 * Queries the DOM for elements with `data-role="qty"` and extracts
 * the ingredient name, unit, and base quantity from the DOM structure.
 *
 * @returns An array of ingredients with name, unit, and baseQuantity
 *
 * @example
 * const ingredients = getIngredientsForShoppingList();
 * // Returns: [
 * //   { name: "flour", unit: "cups", baseQuantity: 2 },
 * //   { name: "sugar", unit: "tbsp", baseQuantity: 0.5 }
 * // ]
 */
export function getIngredientsForShoppingList(): RecipeIngredient[] {
  const ingredientElements = document.querySelectorAll('[data-role="qty"]');
  const ingredients: RecipeIngredient[] = [];

  ingredientElements.forEach(el => {
    const base = el.getAttribute("data-base");
    const unit = el.getAttribute("data-unit") || "";
    const nameEl = el.closest('.ingredient')?.querySelector('.ingredient-name');

    if (nameEl && base !== null && base !== "") {
      ingredients.push({
        name: nameEl.textContent.trim(),
        unit: unit,
        baseQuantity: Number(base)
      });
    }
  });

  return ingredients;
}

/**
 * Check if the current recipe is already in the shopping list.
 *
 * @param recipeSlug - The recipe slug to check
 * @returns true if the recipe is in the shopping list, false otherwise
 *
 * @example
 * if (isRecipeInShoppingList('pasta-carbonara')) {
 *   console.log('Recipe already in list');
 * }
 */
export function isRecipeInShoppingList(recipeSlug: string): boolean {
  return shoppingList.isRecipeInList(recipeSlug);
}

/**
 * Update the shopping list button state based on whether the recipe is in the list.
 *
 * Changes button text and styling to reflect add/remove state.
 *
 * @param button - The button element to update
 * @param recipeSlug - The recipe slug to check
 *
 * @example
 * const button = document.getElementById('addToShoppingListBtn');
 * updateShoppingListButton(button, 'pasta-carbonara');
 */
export function updateShoppingListButton(button: HTMLElement, recipeSlug: string): void {
  if (isRecipeInShoppingList(recipeSlug)) {
    button.textContent = "🛒 Remove from Shopping List";
    button.classList.remove("primary");
    button.classList.add("secondary");
  } else {
    button.textContent = "🛒 Add to Shopping List";
    button.classList.remove("secondary");
    button.classList.add("primary");
  }
}

/**
 * Show a temporary notification message to the user.
 *
 * Creates a fixed notification element that slides in from the right,
 * displays for 2 seconds, then slides out and is removed.
 *
 * @param message - The message to display
 *
 * @example
 * showNotification("Recipe added to shopping list!");
 */
export function showNotification(message: string): void {
  const notification = document.createElement("div");
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: var(--accent-2);
    color: white;
    padding: 1rem 1.5rem;
    border-radius: 8px;
    z-index: 1000;
    animation: slideIn 0.3s ease;
  `;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = "slideOut 0.3s ease";
    setTimeout(() => notification.remove(), 300);
  }, 2000);
}

/**
 * Set up the shopping list button click handler.
 *
 * Handles adding/removing recipes from the shopping list and provides
 * user feedback via notifications.
 *
 * @param button - The shopping list button element
 * @param recipeSlug - The recipe slug
 * @param recipeTitle - The recipe title
 *
 * @example
 * const button = document.getElementById('addToShoppingListBtn');
 * setupShoppingListButton(button, 'pasta-carbonara', 'Pasta Carbonara');
 */
export function setupShoppingListButton(button: HTMLElement, recipeSlug: string, recipeTitle: string): void {
  if (!button) return;

  button.addEventListener("click", () => {
    const ingredients = getIngredientsForShoppingList();

    if (ingredients.length === 0) {
      alert("No ingredients found for this recipe.");
      return;
    }

    const wasRemoved = shoppingList.addRecipe(recipeSlug, recipeTitle, ingredients);
    updateShoppingListButton(button, recipeSlug);

    const message = wasRemoved
      ? "Recipe removed from shopping list!"
      : "Recipe added to shopping list!";

    showNotification(message);
  });
}

/**
 * Initialize the shopping list button state.
 *
 * Uses a timeout to ensure the shopping list is loaded before checking.
 *
 * @param button - The shopping list button element
 * @param recipeSlug - The recipe slug
 *
 * @example
 * const button = document.getElementById('addToShoppingListBtn');
 * initializeShoppingListButton(button, 'pasta-carbonara');
 */
export function initializeShoppingListButton(button: HTMLElement, recipeSlug: string): void {
  updateShoppingListButton(button, recipeSlug);
}
