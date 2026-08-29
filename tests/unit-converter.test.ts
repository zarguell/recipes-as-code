import { describe, it, expect } from 'vitest';
import {
  parseQuantityAndUnit,
  toCanonical,
  convertToDisplayUnit,
} from '../src/utils/unit-converter';

describe('parseQuantityAndUnit', () => {
  it('prefers structured baseQuantity when present', () => {
    expect(parseQuantityAndUnit({ baseQuantity: 250, unit: 'g', name: 'flour' })).toEqual({
      qty: 250,
      unit: 'g',
    });
  });

  it('falls back to null when no quantity exists', () => {
    expect(parseQuantityAndUnit({ baseQuantity: null, unit: null, name: 'salt' })).toEqual({
      qty: null,
      unit: null,
    });
  });
});

describe('toCanonical', () => {
  it('converts volume units to ml', () => {
    expect(toCanonical(2, 'cup')).toMatchObject({ dimension: 'volume', canonicalQty: 480 });
    expect(toCanonical(1, 'tbsp')).toMatchObject({ dimension: 'volume', canonicalQty: 15 });
    expect(toCanonical(1, 'l')).toMatchObject({ dimension: 'volume', canonicalQty: 1000 });
  });

  it('converts weight units to grams', () => {
    expect(toCanonical(1, 'kg')).toMatchObject({ dimension: 'weight', canonicalQty: 1000 });
    expect(toCanonical(500, 'g')).toMatchObject({ dimension: 'weight', canonicalQty: 500 });
  });

  it('handles countable units', () => {
    expect(toCanonical(3, 'clove')).toMatchObject({ dimension: 'each', canonicalQty: 3 });
  });

  it('returns null for unknown units', () => {
    expect(toCanonical(2, 'glug')).toBeNull();
    expect(toCanonical(2, null as any)).toBeNull();
  });

  it('applies unit aliases', () => {
    // "tablespoon" aliases to tbsp
    expect(toCanonical(1, 'tablespoon')).toMatchObject({ dimension: 'volume', canonicalQty: 15 });
  });
});

describe('convertToDisplayUnit', () => {
  it('picks sensible display units', () => {
    expect(convertToDisplayUnit(480, 'volume')).toEqual({ qty: 2, unit: 'cup' });
    expect(convertToDisplayUnit(30, 'volume')).toEqual({ qty: 2, unit: 'tbsp' });
    expect(convertToDisplayUnit(1500, 'weight')).toEqual({ qty: 1.5, unit: 'kg' });
    expect(convertToDisplayUnit(300, 'weight')).toEqual({ qty: 300, unit: 'g' });
  });
});

describe('aggregation math end-to-end', () => {
  it('merges identical ingredients across recipes', () => {
    const a = toCanonical(250, 'g');
    const b = toCanonical(0.5, 'kg');
    expect(a!.dimension).toBe(b!.dimension);
    const display = convertToDisplayUnit(a!.canonicalQty + b!.canonicalQty, a!.dimension);
    expect(display).toEqual({ qty: 750, unit: 'g' });
  });
});
