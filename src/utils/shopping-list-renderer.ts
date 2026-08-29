/**
 * Shopping list DOM rendering + export builders.
 *
 * SECURITY: builds all dynamic content via createElement/textContent.
 * Recipe titles and ingredient names come from arbitrary .cook files and
 * must never be interpolated into innerHTML (the previous implementation
 * was an XSS vector for anyone who can contribute a recipe).
 */

import type { AggregatedIngredient } from './shopping-list-aggregator';
import { formatQty } from '../lib/quantities';
import { ingredientKey } from '../scripts/shopping-list-store';

export function updateEmptyState(isEmpty: boolean): void {
  const emptyState = document.getElementById('empty-state');
  const content = document.getElementById('shopping-list-content');

  if (!emptyState || !content) return;

  emptyState.style.display = isEmpty ? 'block' : 'none';
  content.style.display = isEmpty ? 'none' : 'block';
}

export function updateStats(recipes: any[]): void {
  const listStats = document.getElementById('listStats');
  if (!listStats) return;

  const totalIngredients = recipes.reduce(
    (sum, recipe) => sum + (recipe.ingredients ? recipe.ingredients.length : 0),
    0
  );
  listStats.textContent = `${recipes.length} recipe${recipes.length !== 1 ? 's' : ''}, ${totalIngredients} ingredient${totalIngredients !== 1 ? 's' : ''}`;
}

/**
 * Recipes on the list, each expandable to show its ingredients
 * (the Mealie-style "linked recipes" pattern).
 */
export function buildRecipeList(recipes: any[]): void {
  const recipesList = document.getElementById('recipes-list');
  if (!recipesList) return;

  recipesList.textContent = '';

  recipes.forEach((recipe) => {
    const item = document.createElement('div');
    item.className = 'recipe-item';

    const details = document.createElement('details');
    const summary = document.createElement('summary');

    const title = document.createElement('span');
    title.className = 'recipe-title';
    title.textContent = recipe.title ?? recipe.slug; // textContent — never innerHTML

    const count = document.createElement('span');
    count.className = 'recipe-count';
    const ingredientCount = recipe.ingredients?.length ?? 0;
    count.textContent = `${ingredientCount} item${ingredientCount !== 1 ? 's' : ''}`;

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'remove-recipe';
    removeBtn.dataset.slug = recipe.slug;
    removeBtn.title = 'Remove recipe';
    removeBtn.setAttribute('aria-label', `Remove ${recipe.title ?? recipe.slug} from shopping list`);
    removeBtn.textContent = '×';

    summary.append(title, count, removeBtn);

    const ingredientListEl = document.createElement('ul');
    ingredientListEl.className = 'recipe-ingredients';
    (recipe.ingredients ?? []).forEach((ing: any) => {
      const li = document.createElement('li');
      const qty =
        ing.baseQuantity !== null && ing.baseQuantity !== undefined && ing.baseQuantity > 0
          ? `${formatQty(ing.baseQuantity)}${ing.unit ? ' ' + ing.unit : ''} `
          : '';
      li.textContent = `${qty}${ing.name ?? ''}`.trim();
      ingredientListEl.appendChild(li);
    });

    details.append(summary, ingredientListEl);
    item.appendChild(details);
    recipesList.appendChild(item);
  });
}

export function buildIngredientList(
  aggregated: AggregatedIngredient[],
  classifier: any,
  isChecked: (key: string) => boolean
): void {
  const container = document.getElementById('aggregated-ingredients');
  if (!container) return;

  container.textContent = '';

  if (aggregated.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'no-ingredients';
    empty.textContent = 'No ingredients to show';
    container.appendChild(empty);
    return;
  }

  const sorted = [...aggregated].sort((a, b) => a.name.localeCompare(b.name));
  const grouped = classifier.groupIngredientsByCategory(sorted);
  let ingredientIndex = 0;

  Object.keys(grouped).forEach((category) => {
    const section = document.createElement('div');
    section.className = 'category-section';

    const header = document.createElement('h4');
    header.className = 'category-header';
    header.textContent = category;
    section.appendChild(header);

    const list = document.createElement('div');
    list.className = 'category-ingredients';

    grouped[category].forEach((ingredient: AggregatedIngredient) => {
      const row = document.createElement('div');
      row.className = 'aggregated-item';

      const main = document.createElement('div');
      main.className = 'ingredient-main';

      const id = `ingredient-${ingredientIndex}`;
      ingredientIndex += 1;

      const key = ingredientKey(ingredient.name, ingredient.unit, ingredient.baseQuantity);
      const checked = isChecked(key);

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = id;
      checkbox.className = 'ingredient-checkbox';
      checkbox.dataset.key = key;
      checkbox.checked = checked;

      const label = document.createElement('label');
      label.htmlFor = id;
      label.className = 'ingredient-label';
      if (checked) label.classList.add('checked');

      const qtyText =
        ingredient.baseQuantity !== null && ingredient.baseQuantity > 0
          ? `${formatQty(ingredient.baseQuantity)}${ingredient.unit ? ' ' + ingredient.unit : ''}`
          : '';

      const qtySpan = document.createElement('span');
      qtySpan.className = 'ingredient-quantity';
      qtySpan.textContent = qtyText; // textContent — never innerHTML

      const nameSpan = document.createElement('span');
      nameSpan.className = 'ingredient-name';
      nameSpan.textContent = ingredient.name; // textContent — never innerHTML

      label.append(qtySpan, nameSpan);
      main.append(checkbox, label);
      row.appendChild(main);
      list.appendChild(row);
    });

    section.appendChild(list);
    container.appendChild(section);
  });
}

/** Plain-text export (clipboard / notes apps), grouped by aisle section. */
export function buildListText(
  aggregated: AggregatedIngredient[],
  classifier: any,
  recipes: any[]
): string {
  const lines: string[] = [`Shopping List (${recipes.length} recipe${recipes.length !== 1 ? 's' : ''})`, ''];

  if (aggregated.length === 0) return lines.join('\n').trim();

  const sorted = [...aggregated].sort((a, b) => a.name.localeCompare(b.name));
  const grouped = classifier.groupIngredientsByCategory(sorted);

  Object.keys(grouped).forEach((category) => {
    lines.push(`-- ${category} --`);
    grouped[category].forEach((ingredient: AggregatedIngredient) => {
      const qty =
        ingredient.baseQuantity !== null && ingredient.baseQuantity > 0
          ? `${formatQty(ingredient.baseQuantity)}${ingredient.unit ? ' ' + ingredient.unit : ''} `
          : '';
      lines.push(`[ ] ${qty}${ingredient.name}`.trim());
    });
    lines.push('');
  });

  return lines.join('\n').trim();
}

/** CSV export (rows: Section,Name,Quantity,Unit,Checked). */
export function buildListCsv(
  aggregated: AggregatedIngredient[],
  classifier: any
): string {
  const escape = (value: string | number | null) => {
    const s = String(value ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const rows = ['Section,Name,Quantity,Unit,Checked'];
  const sorted = [...aggregated].sort((a, b) => a.name.localeCompare(b.name));
  const grouped = classifier.groupIngredientsByCategory(sorted);

  Object.keys(grouped).forEach((category) => {
    grouped[category].forEach((ingredient: AggregatedIngredient) => {
      rows.push(
        [
          escape(category),
          escape(ingredient.name),
          escape(ingredient.baseQuantity !== null && ingredient.baseQuantity > 0 ? formatQty(ingredient.baseQuantity) : ''),
          escape(ingredient.unit),
          escape('no'),
        ].join(',')
      );
    });
  });

  return rows.join('\n');
}
