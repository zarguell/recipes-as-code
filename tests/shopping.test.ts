import { describe, it, expect } from 'vitest';
import { normalizeIngredientName, FoodClassifier } from '../src/utils/food-classifier';
import { aggregateIngredients } from '../src/utils/shopping-list-aggregator';

describe('normalizeIngredientName (pure function — the old null-classifier crash)', () => {
  it('strips quantities, units, and descriptors', () => {
    expect(normalizeIngredientName('2 cups chopped onions')).toBe('onions');
    expect(normalizeIngredientName('1/2 cup finely diced carrots')).toBe('carrots');
    expect(normalizeIngredientName('extra virgin olive oil')).toBe('olive oil');
  });

  it('handles empty input without throwing', () => {
    expect(normalizeIngredientName('')).toBe('');
  });
});

describe('FoodClassifier', () => {
  it('classifies using injected data (no fetch needed)', () => {
    const classifier = new FoodClassifier();
    classifier.classificationData = {
      sections: ['Produce', 'Dairy'],
      overrides: { 'baking soda': 'Other' },
      rules: [
        { section: 'Produce', contains: ['tomato', 'onion'] },
        { section: 'Dairy', contains: ['milk', 'cheese'] },
      ],
    };

    expect(classifier.classifyIngredient('2 chopped tomatoes')).toBe('Produce');
    expect(classify(classifier, 'whole milk')).toBe('Dairy');
    expect(classifier.classifyIngredient('baking soda')).toBe('Other');
    expect(classifier.classifyIngredient('mystery item')).toBe('Other');
  });

  it('falls back to Other when data failed to load', () => {
    const classifier = new FoodClassifier();
    expect(classifier.classifyIngredient('tomatoes')).toBe('Other');
  });

  function classify(classifier: FoodClassifier, name: string) {
    return classifier.classifyIngredient(name);
  }
});

describe('aggregateIngredients', () => {
  it('merges the same ingredient across recipes (regression: used to crash on null classifier)', () => {
    const aggregated = aggregateIngredients([
      { ingredients: [{ name: 'flour', unit: 'g', baseQuantity: 250 }] },
      { ingredients: [{ name: 'flour', unit: 'g', baseQuantity: 300 }] },
    ]);

    expect(aggregated).toHaveLength(1);
    expect(aggregated[0]).toMatchObject({ unit: 'g', baseQuantity: 550 });
  });

  it('merges convertible units into the best display unit', () => {
    const aggregated = aggregateIngredients([
      { ingredients: [{ name: 'milk', unit: 'ml', baseQuantity: 500 }] },
      { ingredients: [{ name: 'milk', unit: 'ml', baseQuantity: 500 }] },
    ]);

    expect(aggregated).toHaveLength(1);
    expect(aggregated[0].unit).toBe('cup');
    expect(aggregated[0].baseQuantity).toBeCloseTo(1000 / 240, 5);
  });

  it('groups unquantified ingredients by name only', () => {
    const aggregated = aggregateIngredients([
      { ingredients: [{ name: 'salt', unit: '', baseQuantity: null }] },
      { ingredients: [{ name: 'salt', unit: '', baseQuantity: null }] },
    ]);

    expect(aggregated).toHaveLength(1);
    expect(aggregated[0].baseQuantity).toBeNull();
  });

  it('never throws on malformed recipe entries', () => {
    expect(() =>
      aggregateIngredients([{ ingredients: [null, {}, { name: 'ok', unit: 'g', baseQuantity: 5 }] }, {}])
    ).not.toThrow();
    expect(aggregateIngredients([{ ingredients: [null, {}, { name: 'ok', unit: 'g', baseQuantity: 5 }] }, {}])).toHaveLength(1);
  });
});
