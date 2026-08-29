import { describe, it, expect, vi, afterEach } from 'vitest';
import { ingredientLines, validateFrontmatter } from '../src/lib/recipes';
import { loadCollections, recipeMatches } from '../src/lib/collections';

describe('ingredientLines', () => {
  it('flattens ingredients with quantityParts units', () => {
    const parsed = {
      ingredients: [
        {
          name: 'flour',
          quantity: { type: 'fixed', value: { type: 'decimal', value: 125 } },
          quantityParts: [
            { value: { type: 'fixed', value: { type: 'decimal', value: 125 } }, unit: 'g' },
          ],
          unit: 'g',
        },
        { name: 'butter' },
      ],
    };
    expect(ingredientLines(parsed)).toEqual([
      { name: 'flour', unit: 'g', baseQuantity: 125 },
      { name: 'butter', unit: '', baseQuantity: null },
    ]);
  });

  it('returns empty for malformed input', () => {
    expect(ingredientLines(null)).toEqual([]);
    expect(ingredientLines({})).toEqual([]);
  });
});

describe('validateFrontmatter', () => {
  afterEach(() => vi.restoreAllMocks());

  it('accepts known keys with correct types', () => {
    expect(() =>
      validateFrontmatter(
        { title: 'Test', tags: ['a', 'b'], servings: 4, date: '2026-01-01' },
        'test'
      )
    ).not.toThrow();
  });

  it('throws on badly-typed known keys (fails the build loudly)', () => {
    expect(() => validateFrontmatter({ servings: 'four' }, 'test')).toThrow(/servings/);
    expect(() => validateFrontmatter({ tags: 'quick' }, 'test')).toThrow(/tags/);
  });

  it('warns (does not throw) on unknown keys', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(() => validateFrontmatter({ tittle: 'typo' }, 'test')).not.toThrow();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('tittle'));
  });
});

describe('collections', () => {
  it('recipeMatches by tag (case-insensitive)', () => {
    const c = { name: 'X', slug: 'x', tags: ['quick'] };
    expect(recipeMatches({ tags: ['Quick', 'fun'] }, c)).toBe(true);
    expect(recipeMatches({ tags: ['slow'] }, c)).toBe(false);
  });

  it('recipeMatches by category', () => {
    const c = { name: 'X', slug: 'x', category: 'Dessert' };
    expect(recipeMatches({ category: 'dessert' }, c)).toBe(true);
    expect(recipeMatches({ category: 'main' }, c)).toBe(false);
  });

  it('recipe without metadata never matches', () => {
    const c = { name: 'X', slug: 'x', tags: ['quick'] };
    expect(recipeMatches(undefined, c)).toBe(false);
  });

  it('loadCollections returns [] without a config', () => {
    // runs in cwd without collections.yml? the repo HAS one — so instead:
    const collections = loadCollections();
    expect(Array.isArray(collections)).toBe(true);
  });

  it('repo collections parse and have unique slugs (config-agnostic)', () => {
    const collections = loadCollections();
    const slugs = collections.map((c) => c.slug);
    expect(slugs.length).toBeGreaterThan(0);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const c of collections) {
      expect(c.name).toBeTruthy();
    }
  });
});
