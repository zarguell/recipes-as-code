import { describe, it, expect } from 'vitest';
import { gcd, toNiceFraction, formatQty, formatQtyWithUnit } from '../src/lib/quantities';

describe('gcd', () => {
  it('computes greatest common divisors', () => {
    expect(gcd(12, 8)).toBe(4);
    expect(gcd(7, 5)).toBe(1);
    expect(gcd(0, 5)).toBe(5); // gcd(0,n) = n; the || 1 fallback covers 0,0
  });
});

describe('toNiceFraction', () => {
  it('handles whole numbers', () => {
    expect(toNiceFraction(2)).toEqual({ whole: 2, num: 0, den: 1 });
  });

  it('converts common kitchen fractions', () => {
    expect(toNiceFraction(0.5)).toEqual({ whole: 0, num: 1, den: 2 });
    expect(toNiceFraction(1.75)).toEqual({ whole: 1, num: 3, den: 4 });
    expect(toNiceFraction(0.3333333)).toEqual({ whole: 0, num: 1, den: 3 });
  });

  it('rounds near-whole values up (floating point tolerance)', () => {
    expect(toNiceFraction(1.9999999)).toEqual({ whole: 2, num: 0, den: 1 });
  });
});

describe('formatQty', () => {
  it('formats halves, quarters, and mixed numbers', () => {
    expect(formatQty(0.5)).toBe('1/2');
    expect(formatQty(0.25)).toBe('1/4');
    expect(formatQty(1.75)).toBe('1 3/4');
    expect(formatQty(2)).toBe('2');
  });

  it('handles zero and invalid input', () => {
    expect(formatQty(0)).toBe('0');
    expect(formatQty(NaN)).toBe('');
    expect(formatQty(Infinity)).toBe('');
  });

  it('scales correctly (the scaling feature depends on this)', () => {
    expect(formatQty(0.5 * 3)).toBe('1 1/2');
    expect(formatQty(1.5 * 0.5)).toBe('3/4');
    expect(formatQty(0.75 * 2)).toBe('1 1/2');
  });
});

describe('formatQtyWithUnit', () => {
  it('appends units', () => {
    expect(formatQtyWithUnit(1.5, 'cup')).toBe('1 1/2 cup');
    expect(formatQtyWithUnit(2, '')).toBe('2');
    expect(formatQtyWithUnit(2, null)).toBe('2');
  });
});
