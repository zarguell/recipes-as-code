/**
 * UnitConverter - Converts and formats ingredient quantities
 *
 * Provides unit conversion and normalization utilities:
 * - Parse quantities and units from ingredients
 * - Convert to canonical units (ml for volume, g for weight)
 * - Convert back to display units (cups, tbsp, kg, etc.)
 *
 * Quantity FORMATTING lives in src/lib/quantities.ts (single source of
 * truth) — do not re-implement it here.
 */

export const conversions = {
  tsp: 5,
  teaspoon: 5,
  tbsp: 15,
  tablespoon: 15,
  cup: 240,
  cups: 240,
  ml: 1,
  l: 1000,
  liter: 1000,
  fl_oz: 29.5735,
  'fl oz': 29.5735,
  fluid_ounce: 29.5735,
  g: 1,
  gram: 1,
  grams: 1,
  kg: 1000,
  kilogram: 1000,
  kilograms: 1000,
  oz: 28.3495,
  ounce: 28.3495,
  ounces: 28.3495,
  lb: 453.592,
  lbs: 453.592,
  pound: 453.592,
  pounds: 453.592
};

export const unitAliases = {
  'tsp.': 'tsp',
  't': 'tsp',
  'tbsp.': 'tbsp',
  'tbs': 'tbsp',
  'tablespoon': 'tbsp',
  'teaspoon': 'tsp',
  'c': 'cup',
  'fl oz': 'fl_oz',
  'fl. oz.': 'fl_oz',
  'fluid ounce': 'fl_oz',
  'liter': 'l',
  'litre': 'l',
  'gram': 'g',
  'grams': 'g',
  'kilogram': 'kg',
  'kilograms': 'kg',
  'ounce': 'oz',
  'ounces': 'oz',
  'pound': 'lb',
  'pounds': 'lb',
  'clove': 'clove',
  'cloves': 'clove',
  'can': 'can',
  'cans': 'can',
  'package': 'package',
  'packages': 'package'
};

export function parseQuantityAndUnit(ingredient: any) {
  if (ingredient.baseQuantity !== null && ingredient.baseQuantity !== undefined) {
    return {
      qty: ingredient.baseQuantity,
      unit: ingredient.unit || null
    };
  }

  const nameWithQty = ingredient.name;
  const qtyMatch = nameWithQty.match(/^([\d\s\/]+)\s*([a-z]*)\s*/i);

  if (qtyMatch) {
    const qtyStr = qtyMatch[1].trim();
    const unit = qtyMatch[2] || null;

    const parseFraction = (str: string) => {
      if (str.includes('/')) {
        const parts = str.split(' ');
        if (parts.length === 2) {
          const whole = parseInt(parts[0], 10);
          const fraction = parts[1];
          const fracParts = fraction.split('/');
          if (fracParts.length === 2) {
            return whole + (parseInt(fracParts[0], 10) / parseInt(fracParts[1], 10));
          }
        } else if (parts.length === 1) {
          const fracParts = str.split('/');
          if (fracParts.length === 2) {
            return parseInt(fracParts[0], 10) / parseInt(fracParts[1], 10);
          }
        }
      }
      return parseFloat(str);
    };

    const qty = parseFraction(qtyStr);
    return { qty: isNaN(qty) ? null : qty, unit };
  }

  return { qty: null, unit: null };
}

export function toCanonical(qty: number, unit: string) {
  if (qty === null || qty === undefined || unit === null || unit === undefined) {
    return null;
  }

  const normalizedUnit = unit.toLowerCase().trim();
  const canonicalUnit = unitAliases[normalizedUnit] || normalizedUnit;

  if (conversions[canonicalUnit]) {
    if (['tsp', 'teaspoon', 'tbsp', 'tablespoon', 'cup', 'cups', 'ml', 'l', 'liter', 'fl_oz', 'fluid_ounce'].includes(canonicalUnit)) {
      const ml = qty * conversions[canonicalUnit];
      return { dimension: 'volume', canonicalQty: ml, canonicalUnit: 'ml' };
    }

    if (['g', 'gram', 'grams', 'kg', 'kilogram', 'kilograms', 'oz', 'ounce', 'ounces', 'lb', 'pound', 'pounds'].includes(canonicalUnit)) {
      const g = qty * conversions[canonicalUnit];
      return { dimension: 'weight', canonicalQty: g, canonicalUnit: 'g' };
    }
  }

  if (['clove', 'can', 'package'].includes(canonicalUnit)) {
    return { dimension: 'each', canonicalQty: qty, canonicalUnit: 'each' };
  }

  return null;
}

export function convertToDisplayUnit(canonicalQty: number, dimension: string) {
  if (dimension === 'volume') {
    if (canonicalQty >= 240) {
      const cups = canonicalQty / 240;
      return { qty: cups, unit: 'cup' };
    } else if (canonicalQty >= 15) {
      const tbsp = canonicalQty / 15;
      return { qty: tbsp, unit: 'tbsp' };
    } else if (canonicalQty >= 5) {
      const tsp = canonicalQty / 5;
      return { qty: tsp, unit: 'tsp' };
    } else {
      return { qty: canonicalQty, unit: 'ml' };
    }
  } else if (dimension === 'weight') {
    if (canonicalQty >= 1000) {
      const kg = canonicalQty / 1000;
      return { qty: kg, unit: 'kg' };
    } else {
      return { qty: canonicalQty, unit: 'g' };
    }
  } else if (dimension === 'each') {
    return { qty: canonicalQty, unit: '' };
  }

  return { qty: canonicalQty, unit: '' };
}

// formatQuantity() removed — use formatQty() from src/lib/quantities.ts
