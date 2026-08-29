/**
 * Quantity formatting utilities for recipe measurements.
 * The SINGLE source of truth for fraction/quantity formatting across
 * build-time components and client-side scripts. Do not copy this logic —
 * import it.
 *
 * Converts decimal quantities to nice fractions with common kitchen
 * denominators (2, 3, 4, 6, 8, 12, 16).
 */

/**
 * Greatest common divisor for simplifying fractions.
 * Uses Euclidean algorithm.
 *
 * @param a - First number
 * @param b - Second number
 * @returns The GCD of a and b
 *
 * @example
 * gcd(12, 8) // returns 4
 * gcd(7, 5)  // returns 1
 */
export function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a || 1;
}

/**
 * Fraction representation with whole number and fractional parts.
 */
export interface Fraction {
  whole: number;
  num: number;
  den: number;
}

/**
 * Convert a decimal number to a nice fraction using common kitchen denominators.
 *
 * Uses denominators: [2, 3, 4, 6, 8, 12, 16]
 * Returns a simplified fraction object.
 *
 * @param x - The decimal number to convert
 * @returns A fraction object with whole, numerator, and denominator
 *
 * @example
 * toNiceFraction(0.5)   // returns { whole: 0, num: 1, den: 2 }
 * toNiceFraction(1.75)  // returns { whole: 1, num: 3, den: 4 }
 * toNiceFraction(2.0)   // returns { whole: 2, num: 0, den: 1 }
 */
export function toNiceFraction(x: number): Fraction {
  // handle whole numbers
  const whole = Math.floor(x + 1e-10);
  const frac = x - whole;

  if (frac < 1e-6) return { whole, num: 0, den: 1 };

  // common kitchen denominators
  const dens = [2, 3, 4, 6, 8, 12, 16];
  let best = { num: 0, den: 1, err: Infinity };

  for (const den of dens) {
    const num = Math.round(frac * den);
    const approx = num / den;
    const err = Math.abs(frac - approx);
    if (err < best.err) best = { num, den, err };
  }

  // simplify
  const g = gcd(best.num, best.den);
  const num = best.num / g;
  const den = best.den / g;

  // handle rounding to next whole (e.g. 15/16 * 16)
  if (num === den) return { whole: whole + 1, num: 0, den: 1 };

  return { whole, num, den };
}

/**
 * Format a decimal number as a nice fraction string.
 *
 * Handles whole numbers, proper fractions, and mixed numbers.
 * Returns empty string for non-finite values.
 *
 * @param x - The decimal number to format
 * @returns A formatted string representation
 *
 * @example
 * formatQty(0.5)    // returns "1/2"
 * formatQty(1.75)   // returns "1 3/4"
 * formatQty(2.0)    // returns "2"
 * formatQty(0)      // returns "0"
 * formatQty(NaN)    // returns ""
 */
export function formatQty(x: number): string {
  // show 0 as 0
  if (!Number.isFinite(x)) return "";
  if (x === 0) return "0";

  const { whole, num, den } = toNiceFraction(x);

  if (num === 0) return String(whole);
  if (whole === 0) return `${num}/${den}`;
  return `${whole} ${num}/${den}`;
}

/**
 * Append a unit to a formatted quantity, e.g. formatQtyWithUnit(1.5, "cup")
 * returns "1 1/2 cup". Unit is optional/empty-safe.
 */
export function formatQtyWithUnit(x: number, unit?: string | null): string {
  const qty = formatQty(x);
  if (!qty) return "";
  return unit ? `${qty} ${unit}` : qty;
}
