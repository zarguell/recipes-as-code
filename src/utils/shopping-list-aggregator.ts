/**
 * Shopping list ingredient aggregation.
 *
 * Pure functions: merge ingredient lines across recipes by normalized
 * name + measurement dimension, converting through canonical units
 * (ml for volume, g for weight) so "250 g flour" + "1 cup flour"
 * combine sensibly.
 */

import { normalizeIngredientName } from './food-classifier';
import {
  parseQuantityAndUnit,
  toCanonical,
  convertToDisplayUnit,
} from './unit-converter';

export interface AggregatedIngredient {
  name: string;
  unit: string;
  baseQuantity: number | null;
}

interface Accumulator {
  name: string;
  normalizedName: string;
  dimension: string;
  canonicalQty: number;
  originalUnit: string;
  hasQuantity: boolean;
}

/**
 * Aggregate ingredients from a set of stored recipes
 * (shape: { ingredients: [{ name, unit, baseQuantity }] }).
 */
export function aggregateIngredients(recipes: any[]): AggregatedIngredient[] {
  const aggregated: Record<string, Accumulator> = {};

  recipes.forEach((recipe) => {
    (recipe.ingredients || []).forEach((ingredient: any) => {
      if (!ingredient?.name) return;

      const normalizedName = normalizeIngredientName(ingredient.name);
      const { qty, unit } = parseQuantityAndUnit(ingredient);

      let dimension = 'none';
      let canonicalQty: number | null = null;
      let key = `${normalizedName}__none`;

      if (qty !== null && unit !== null) {
        const canonical = toCanonical(qty, unit);
        if (canonical) {
          dimension = canonical.dimension;
          canonicalQty = canonical.canonicalQty;
          key = `${normalizedName}__${dimension}`;
        }
      }

      if (!aggregated[key]) {
        aggregated[key] = {
          name: ingredient.name,
          normalizedName,
          dimension,
          canonicalQty: 0,
          originalUnit: unit || '',
          hasQuantity: false,
        };
      }

      if (canonicalQty !== null) {
        aggregated[key].canonicalQty += canonicalQty;
        aggregated[key].hasQuantity = true;
      }
    });
  });

  return Object.values(aggregated).map((item): AggregatedIngredient => {
    if (item.hasQuantity && item.dimension !== 'none') {
      const display = convertToDisplayUnit(item.canonicalQty, item.dimension);
      return {
        name: item.name,
        unit: display.unit,
        baseQuantity: display.qty,
      };
    }

    // No convertible quantity: keep the first-seen unit, sum anything we
    // could parse but not convert (e.g. "2 cloves" + "3 cloves").
    return {
      name: item.name,
      unit: item.originalUnit,
      baseQuantity: item.hasQuantity ? item.canonicalQty : null,
    };
  });
}
