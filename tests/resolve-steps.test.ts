import { describe, it, expect } from 'vitest';
import { resolveSteps } from '../src/lib/recipes';
import { parseTimeToMinutes, formatMinutes } from '../src/lib/time';

/**
 * Fixture mirrors the REAL @tmlmt/cooklang-parser output shape
 * (tokens reference arrays by `index`; quantities live in quantityParts).
 * Regression guard: code that reads `item.value` or `item.itemQuantity`
 * silently renders nothing.
 */
const fixture = {
  ingredients: [
    { name: 'eggs', quantity: { type: 'fixed', value: { type: 'decimal', value: 3 } } },
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
  cookware: [{ name: 'bowl' }, { name: 'frying pan' }],
  timers: [
    { duration: { type: 'fixed', value: { type: 'decimal', value: 15 } }, unit: 'minutes' },
    { duration: { type: 'fixed', value: { type: 'decimal', value: 1 } }, unit: 'hour' },
    { duration: { type: 'fixed', value: { type: 'decimal', value: 2 } }, unit: 'minutes|4%minutes' },
  ],
  sections: [
    {
      content: [
        {
          type: 'step',
          items: [
            { type: 'text', value: 'Crack the ' },
            { type: 'ingredient', index: 0, displayName: 'eggs', quantityPartIndex: 0 },
            { type: 'text', value: ' into ' },
            { type: 'cookware', index: 0 },
            { type: 'text', value: ' for ' },
            { type: 'timer', index: 0 },
            { type: 'text', value: '.' },
          ],
        },
        {
          type: 'step',
          items: [
            { type: 'ingredient', index: 1, displayName: 'flour', quantityPartIndex: 0 },
            { type: 'text', value: ' and ' },
            { type: 'ingredient', index: 2, displayName: 'butter' },
            { type: 'text', value: ' then cook in ' },
            { type: 'cookware', index: 1 },
            { type: 'text', value: ' for ' },
            { type: 'timer', index: 1 },
            { type: 'text', value: ' or ' },
            { type: 'timer', index: 2 },
            { type: 'text', value: '.' },
          ],
        },
      ],
    },
  ],
};

describe('resolveSteps', () => {
  it('resolves ingredient tokens with quantities and units', () => {
    const steps = resolveSteps(fixture);
    const step0 = steps[0];

    const ing = step0.tokens.find((t) => t.kind === 'ingredient');
    expect(ing).toMatchObject({ text: 'eggs', quantity: 3, unit: '' });

    const flour = steps[1].tokens.find((t) => t.kind === 'ingredient' && t.text === 'flour');
    expect(flour).toMatchObject({ text: 'flour', quantity: 125, unit: 'g' });

    // quantityless ingredient
    const butter = steps[1].tokens.find((t) => t.kind === 'ingredient' && t.text === 'butter');
    expect(butter?.quantity ?? null).toBeNull();
  });

  it('resolves cookware tokens by index (regression: item.value lookup)', () => {
    const steps = resolveSteps(fixture);
    const cookware = steps.map((s) => s.tokens.filter((t) => t.kind === 'cookware')).flat();
    expect(cookware.map((t) => t.text)).toEqual(['bowl', 'frying pan']);
  });

  it('resolves timer tokens to seconds with range-encoding fallback', () => {
    const steps = resolveSteps(fixture);
    const timers = steps.map((s) => s.tokens.filter((t) => t.kind === 'timer')).flat();
    expect(timers.map((t) => t.durationSeconds)).toEqual([900, 3600, 120]);
    expect(timers[0].text).toBe('15 min');
    expect(timers[1].text).toBe('1 h');
  });

  it('collects de-duplicated per-step ingredients', () => {
    const steps = resolveSteps(fixture);
    expect(steps[1].ingredients).toEqual([
      { name: 'flour', qty: 125, unit: 'g' },
      { name: 'butter', qty: null, unit: '' },
    ]);
  });

  it('supports value-referencing parser output too', () => {
    const altParser = {
      ...fixture,
      sections: [
        {
          content: [
            {
              type: 'step',
              items: [{ type: 'cookware', value: 1 }],
            },
          ],
        },
      ],
    };
    const steps = resolveSteps(altParser);
    expect(steps[0].tokens[0]).toMatchObject({ kind: 'cookware', text: 'frying pan' });
  });
});

describe('parseTimeToMinutes', () => {
  it('parses common metadata formats', () => {
    expect(parseTimeToMinutes('25 min')).toBe(25);
    expect(parseTimeToMinutes('1 hour')).toBe(60);
    expect(parseTimeToMinutes('1 hour 15 minutes')).toBe(75);
    expect(parseTimeToMinutes('Prep: 10 mins')).toBe(10);
    expect(parseTimeToMinutes('2h')).toBe(120);
    expect(parseTimeToMinutes(45)).toBe(45);
  });

  it('returns null for unusable input', () => {
    expect(parseTimeToMinutes(null)).toBeNull();
    expect(parseTimeToMinutes('')).toBeNull();
    expect(parseTimeToMinutes('quick')).toBeNull();
    expect(parseTimeToMinutes(NaN)).toBeNull();
  });
});

describe('formatMinutes', () => {
  it('formats compact durations', () => {
    expect(formatMinutes(25)).toBe('25 min');
    expect(formatMinutes(60)).toBe('1 h');
    expect(formatMinutes(90)).toBe('1 h 30 min');
    expect(formatMinutes(null)).toBe('');
  });
});
