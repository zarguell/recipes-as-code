import { describe, it, expect, skipIf } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  listRecipeFiles,
  loadRecipeFile,
  getAllRecipes,
  slugFromPath,
  slugifyTag,
  parseFrontmatter,
  extractSteps,
} from '../src/lib/recipes';

const examplePath = resolve('recipes', 'example.cook');
// The template ships example.cook; downstream recipe repos replace the
// recipes/ directory with their own collection — skip those tests there.
const hasExample = existsSync(examplePath);

describe('listRecipeFiles', () => {
  it('finds recipes recursively (regression: flat readdir dropped subfolders)', () => {
    const files = listRecipeFiles();
    expect(files.length).toBeGreaterThan(0);
    expect(files.every((f) => f.endsWith('.cook'))).toBe(true);
  });
});

describe('loadRecipeFile', () => {
  describe.skipIf(!hasExample)('with the template example recipe', () => {
    it('merges YAML frontmatter into metadata (regression: RSS showed slugs)', () => {
      const recipe = loadRecipeFile(examplePath);
      expect(recipe.slug).toBe('example');
      expect(recipe.parsed.metadata.tags).toEqual(['fun', 'quick']);
      expect(recipe.parsed.metadata.source).toBe('https://www.jamieoliver.com/recipes/eggs-recipes/easy-pancakes/');
    });

    it('falls back to slug title when no frontmatter title exists', () => {
      const recipe = loadRecipeFile(examplePath);
      expect(recipe.title).toBe('example');
    });
  });

  it.skipIf(!hasExample)('captures file mtime as a stable fallback date', () => {
    const recipe = loadRecipeFile(examplePath);
    expect(() => new Date(recipe.modifiedTime)).not.toThrow();
    expect(new Date(recipe.modifiedTime).getTime()).not.toBeNaN();
  });
});

describe('getAllRecipes', () => {
  it('loads recipes sorted by title', () => {
    const recipes = getAllRecipes();
    expect(recipes.length).toBeGreaterThan(0);
    const titles = recipes.map((r) => r.title);
    expect([...titles].sort((a, b) => a.localeCompare(b))).toEqual(titles);
  });
});

describe('extractSteps', () => {
  it.skipIf(!hasExample)('pulls steps out of sections in order', () => {
    const recipe = loadRecipeFile(examplePath);
    const steps = extractSteps(recipe.parsed);
    expect(steps.length).toBeGreaterThan(0);
    expect(steps.every((s: any) => s.type === 'step')).toBe(true);
  });
});

describe('parseFrontmatter', () => {
  it('extracts YAML frontmatter and body', () => {
    const { frontmatter, recipeContent } = parseFrontmatter('---\ntitle: Test\nservings: 2\n---\nBody here');
    expect(frontmatter).toEqual({ title: 'Test', servings: 2 });
    expect(recipeContent).toBe('Body here');
  });

  it('returns content untouched when there is no frontmatter', () => {
    const { frontmatter, recipeContent } = parseFrontmatter('Just a recipe');
    expect(frontmatter).toEqual({});
    expect(recipeContent).toBe('Just a recipe');
  });
});

describe('slugify helpers', () => {
  it('slugifies tags for URLs', () => {
    expect(slugifyTag('Quick & Easy')).toBe('quick-easy');
    expect(slugifyTag('Café de la Paix')).toBe('cafe-de-la-paix');
    expect(slugifyTag('')).toBe('tag');
  });

  it('flattens nested recipe paths to unique slugs', () => {
    expect(slugFromPath(resolve('recipes', 'nested', 'dir', 'cake.cook'))).toBe('nested--dir--cake');
  });
});
