/**
 * Recipe scaling utilities for ingredient quantities.
 * Handles dynamic scaling of recipe ingredients with formatted display.
 */

import { formatQty } from '../lib/quantities';

/**
 * Apply a scaling multiplier to all ingredient quantities in the recipe.
 *
 * Queries the DOM for elements with `data-role="qty"` and updates their
 * text content with the scaled quantity and unit.
 *
 * @param mult - The scaling multiplier (e.g., 0.5 for half, 2 for double)
 *
 * @example
 * // Double the recipe
 * applyScale(2);
 *
 * @example
 * // Halve the recipe
 * applyScale(0.5);
 *
 * @example
 * // Reset to original (1x)
 * applyScale(1);
 */
export function applyScale(mult: number): void {
  const ingredientRoot = document.getElementById("ingredientList");
  if (!ingredientRoot) return;

  const els = ingredientRoot.querySelectorAll('[data-role="qty"]');
  els.forEach((el) => {
    const rawBase = el.getAttribute("data-base");
    const unit = el.getAttribute("data-unit") || "";
    const base = rawBase ? Number(rawBase) : NaN;
    if (!Number.isFinite(base)) return;

    const scaled = base * mult;
    el.textContent = `${formatQty(scaled)}${unit ? ` ${unit}` : ""}`;
  });
}
