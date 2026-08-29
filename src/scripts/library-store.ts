/**
 * User library: favorites and recently viewed recipes.
 *
 * Client-side only (localStorage). Validated reads — corrupted data
 * resets the slice instead of throwing. Companion to
 * shopping-list-store.ts; same patterns.
 */

const FAVORITES_KEY = "favorite-recipes";
const RECENTS_KEY = "recent-recipes";
const RECENTS_CAP = 12;

function readStringArray(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data.filter((v): v is string => typeof v === "string");
  } catch {
    return [];
  }
}

function writeStringArray(key: string, values: string[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(values));
  } catch {
    /* storage unavailable — stay in-memory */
  }
}

// --- Favorites ---

export function getFavorites(): string[] {
  return readStringArray(FAVORITES_KEY);
}

export function isFavorite(slug: string): boolean {
  return getFavorites().includes(slug);
}

/** Toggle. Returns the new state (true = now a favorite). */
export function toggleFavorite(slug: string): boolean {
  const favorites = getFavorites();
  const index = favorites.indexOf(slug);
  if (index >= 0) favorites.splice(index, 1);
  else favorites.unshift(slug);
  writeStringArray(FAVORITES_KEY, favorites);
  return index < 0;
}

// --- Recently viewed ---

export function getRecents(): string[] {
  return readStringArray(RECENTS_KEY);
}

/** Record a recipe view (most-recent-first, de-duplicated, capped). */
export function recordRecent(slug: string): void {
  if (!slug) return;
  const recents = getRecents().filter((s) => s !== slug);
  recents.unshift(slug);
  writeStringArray(RECENTS_KEY, recents.slice(0, RECENTS_CAP));
}
