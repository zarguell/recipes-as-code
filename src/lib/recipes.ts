/**
 * Unified recipe loading pipeline.
 *
 * This is the ONLY place that reads recipe files from disk. Every page
 * (index, recipe detail, tags, RSS) must consume recipes through this
 * module so that frontmatter handling, slugs, and metadata merging are
 * consistent everywhere.
 *
 * Replaces the four divergent implementations that previously lived in
 * src/utils/parse-recipe.ts, src/pages/recipes/[slug].astro,
 * src/pages/tags/[tag].astro and src/pages/rss.xml.ts.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { Recipe } from "@tmlmt/cooklang-parser";
import * as yaml from "js-yaml";

/** A loaded recipe, shaped for direct use by pages/components. */
export interface LoadedRecipe {
  /** URL slug (filename without .cook, directories joined with "--"). */
  slug: string;
  /** Raw recipe title from frontmatter/metadata. */
  title: string;
  /** ISO-ish modification time of the source file (fallback publish date). */
  modifiedTime: string;
  /** Full raw file contents (frontmatter included) for source display/download. */
  rawContent: string;
  /** Parsed cooklang Recipe (metadata merged with YAML frontmatter). */
  parsed: any;
}

const RECIPES_DIR = resolve("recipes");

/**
 * Recursively collect all .cook files under recipes/.
 * Fixes the previous flat-readdir behavior that silently dropped recipes
 * stored in subdirectories.
 */
export function listRecipeFiles(): string[] {
  const files: string[] = [];

  const walk = (dir: string) => {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return; // recipes dir missing entirely — treat as empty collection
    }
    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue; // skip dotfiles/dirs
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile() && entry.name.endsWith(".cook")) files.push(full);
    }
  };

  walk(RECIPES_DIR);
  return files.sort();
}

/**
 * Derive a URL-safe slug from a recipe file path.
 * Subdirectory recipes become "<dir>--<name>" to stay flat and unique.
 */
export function slugFromPath(filePath: string): string {
  const rel = relative(RECIPES_DIR, filePath).replace(/\.cook$/, "");
  return rel.split(/[\\/]/).join("--");
}

/**
 * Slugify an arbitrary tag for use in URLs: lowercase, ascii, hyphenated.
 * Tags that slugify to the same value are treated as the same tag page;
 * the raw tag is preserved for display via props.
 */
export function slugifyTag(tag: string): string {
  const slug = tag
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "tag";
}

/**
 * Extract YAML frontmatter from raw recipe content.
 * One shared implementation — frontmatter syntax is `---\n…\n---`.
 */
export function parseFrontmatter(content: string): {
  frontmatter: Record<string, any>;
  recipeContent: string;
} {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { frontmatter: {}, recipeContent: content };

  try {
    const frontmatter = (yaml.load(match[1]) as Record<string, any>) || {};
    return { frontmatter, recipeContent: match[2] };
  } catch (e) {
    console.error("Error parsing YAML frontmatter:", e);
    return { frontmatter: {}, recipeContent: match[2] };
  }
}

/**
 * Load and parse a single recipe file.
 * Frontmatter always wins over cooklang-internal metadata, everywhere.
 * A broken recipe logs a loud error and yields an empty-but-valid object
 * rather than crashing the whole build.
 */
export function loadRecipeFile(filePath: string): LoadedRecipe {
  const slug = slugFromPath(filePath);
  const content = readFileSync(filePath, "utf-8");
  const { frontmatter, recipeContent } = parseFrontmatter(content);
  validateFrontmatter(frontmatter, slug);

  let parsed: any;
  try {
    parsed = new Recipe(recipeContent);
    parsed.metadata = { ...parsed.metadata, ...frontmatter };
  } catch (error: any) {
    console.error(`Error parsing recipe ${slug}:`, error?.message ?? error);
    parsed = { metadata: { ...frontmatter }, ingredients: [], sections: [], cookware: [], timers: [] };
  }

  let mtime: string;
  try {
    mtime = statSync(filePath).mtime.toISOString();
  } catch {
    mtime = new Date(0).toISOString();
  }

  return {
    slug,
    title: parsed.metadata?.title || slug,
    modifiedTime: mtime,
    rawContent: content,
    parsed,
  };
}

/** Load every recipe in the collection, sorted by title. */
export function getAllRecipes(): LoadedRecipe[] {
  const recipes = listRecipeFiles().map(loadRecipeFile);
  recipes.sort((a, b) => a.title.localeCompare(b.title));
  return recipes;
}

/** Find a loaded recipe by slug. */
export function getRecipeBySlug(slug: string): LoadedRecipe | undefined {
  return listRecipeFiles()
    .map(loadRecipeFile)
    .find((r) => r.slug === slug);
}

/**
 * Extract a flat, ordered list of step items from a parsed recipe,
 * merging steps from all sections in order.
 */
export function extractSteps(parsed: any): any[] {
  const steps: any[] = [];
  if (parsed?.sections) {
    for (const section of parsed.sections) {
      if (section?.content) {
        steps.push(...section.content.filter((item: any) => item?.type === "step"));
      }
    }
  }
  return steps;
}

// ---------------------------------------------------------------------------
// Step token resolution
//
// The parser emits step tokens as { type, index } references into the
// recipe-level arrays (some parsers use { type, value } instead — support
// both), and per-token ingredient quantities live in
// ingredients[index].quantityParts[quantityPartIndex]. Components must not
// guess at this shape — they consume the resolved form below.
// ---------------------------------------------------------------------------

export interface StepToken {
  kind: "text" | "ingredient" | "cookware" | "timer";
  /** Display text: raw text, ingredient/cookware name, or timer label. */
  text: string;
  /** Ingredient tokens: numeric quantity for scaling (null if unitless). */
  quantity?: number | null;
  /** Ingredient tokens: unit string (may be empty). */
  unit?: string;
  /** Timer tokens: StepToken in seconds (null when unparseable). */
  durationSeconds?: number | null;
}

export interface ResolvedStep {
  tokens: StepToken[];
  /** De-duplicated ingredient usage for this step (chips/scaling). */
  ingredients: { name: string; qty: number | null; unit: string }[];
}

function tokenIndex(item: any): number | undefined {
  const idx = item?.value ?? item?.index;
  return typeof idx === "number" ? idx : undefined;
}

function fixedValueToNumber(quantity: any): number | null {
  // Shapes: { type:"fixed", value:{ type:"decimal"|"fraction", ... } }, plain number.
  if (typeof quantity === "number") return Number.isFinite(quantity) ? quantity : null;
  if (quantity?.type !== "fixed") return null;
  const v = quantity.value;
  if (v?.type === "decimal" && typeof v.value === "number") return v.value;
  if (v?.type === "fraction" && typeof v.num === "number" && typeof v.den === "number" && v.den !== 0) {
    return v.num / v.den;
  }
  return null;
}

function timerDurationSeconds(timerItem: any): number | null {
  const quantity = fixedValueToNumber(timerItem?.duration);
  if (quantity === null) return null;
  let unit = timerItem?.unit || "minutes";
  if (typeof unit === "string" && unit.includes("|")) {
    // Range encoding e.g. "minutes|4%minutes" — use the lower bound + real unit.
    unit = unit.split("|")[0];
  }
  const seconds =
    unit.startsWith("hour") || unit === "h"
      ? quantity * 3600
      : unit.startsWith("sec") || unit === "s"
        ? quantity
        : quantity * 60; // default minutes
  return Math.round(seconds);
}

function formatDurationLabel(seconds: number): string {
  if (seconds >= 3600 && seconds % 3600 === 0) return `${seconds / 3600} h`;
  if (seconds >= 60 && seconds % 60 === 0) return `${seconds / 60} min`;
  return `${seconds} sec`;
}

/**
 * Resolve raw parser steps into presentation-ready tokens.
 * The single place that knows the parser's token shape.
 */
export function resolveSteps(parsed: any): ResolvedStep[] {
  const ingredients: any[] = parsed?.ingredients ?? [];
  const cookware: any[] = parsed?.cookware ?? [];
  const timers: any[] = parsed?.timers ?? [];

  return extractSteps(parsed).map((step: any) => {
    const tokens: StepToken[] = [];
    const usedIngredients: ResolvedStep["ingredients"] = [];
    const seen = new Set<string>();

    for (const item of step.items ?? []) {
      if (!item) continue;

      if (item.type === "text") {
        const value = item.value;
        const text = Array.isArray(value) ? value.filter((v) => v != null).join(" ") : String(value ?? "");
        if (text) tokens.push({ kind: "text", text });
        continue;
      }

      if (item.type === "ingredient") {
        const idx = tokenIndex(item);
        const source = typeof idx === "number" ? ingredients[idx] : undefined;
        const name = item.displayName || source?.name || "";
        if (!name) continue;

        // Per-token quantity: quantityParts[quantityPartIndex] wins, then
        // the ingredient-level quantity/unit.
        const part =
          source?.quantityParts && typeof item.quantityPartIndex === "number"
            ? source.quantityParts[item.quantityPartIndex]
            : undefined;
        const quantity =
          fixedValueToNumber(part?.value) ?? fixedValueToNumber(source?.quantity);
        const unit = part?.unit ?? source?.unit ?? "";

        tokens.push({
          kind: "ingredient",
          text: name,
          quantity,
          unit,
        });

        const key = `${name}|${quantity ?? ""}|${unit}`;
        if (!seen.has(key)) {
          seen.add(key);
          usedIngredients.push({ name, qty: quantity, unit });
        }
        continue;
      }

      if (item.type === "cookware") {
        const idx = tokenIndex(item);
        const name = (typeof idx === "number" ? cookware[idx]?.name : undefined) || "cookware";
        tokens.push({ kind: "cookware", text: name });
        continue;
      }

      if (item.type === "timer") {
        const idx = tokenIndex(item);
        const timerItem = typeof idx === "number" ? timers[idx] : undefined;
        const seconds = timerDurationSeconds(timerItem);
        tokens.push({
          kind: "timer",
          text: seconds !== null ? formatDurationLabel(seconds) : "timer",
          durationSeconds: seconds,
        });
        continue;
      }
    }

    return { tokens, ingredients: usedIngredients };
  });
}

/**
 * Flatten a parsed recipe's ingredients into the plain lines used by the
 * shopping list (name, unit, numeric base quantity). Build-time twin of
 * the DOM scraping the recipe page does — lets the planner add recipes
 * to the list without a page in the DOM.
 */
export function ingredientLines(parsed: any): {
  name: string;
  unit: string;
  baseQuantity: number | null;
}[] {
  const out: { name: string; unit: string; baseQuantity: number | null }[] = [];
  for (const ing of parsed?.ingredients ?? []) {
    if (!ing?.name) continue;
    const part =
      ing.quantityParts && typeof ing.quantityParts[0] !== "undefined"
        ? ing.quantityParts[0]
        : undefined;
    const baseQuantity =
      fixedValueToNumber(part?.value) ?? fixedValueToNumber(ing.quantity);
    out.push({ name: ing.name, unit: part?.unit ?? ing.unit ?? "", baseQuantity });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Frontmatter validation
//
// Files are the CMS; this is the contract check. Unknown keys warn (typos
// shouldn't fail a build), badly-typed known keys fail loudly with the key
// name so authors get actionable errors in CI.
// ---------------------------------------------------------------------------

const KNOWN_KEYS: Record<string, "string" | "string[]" | "number" | "date"> = {
  title: "string",
  description: "string",
  image: "string",
  source: "string",
  tags: "string[]",
  category: "string",
  cuisine: "string",
  servings: "number",
  "prep-time": "string",
  "cook-time": "string",
  "total-time": "string",
  date: "date",
  author: "string",
  nutrition: "string", // freeform block — display-only
};

export function validateFrontmatter(
  frontmatter: Record<string, any>,
  slug: string
): void {
  for (const [key, value] of Object.entries(frontmatter)) {
    const expected = KNOWN_KEYS[key];

    if (!expected) {
      console.warn(`[${slug}] Unknown frontmatter key "${key}" (typo? see docs/get-well/03 §3)`);
      continue;
    }
    if (value === null || value === undefined) continue;

    const ok =
      (expected === "string" && typeof value === "string") ||
      (expected === "string[]" && Array.isArray(value) && value.every((v) => typeof v === "string")) ||
      (expected === "number" && typeof value === "number") ||
      (expected === "date" && (value instanceof Date || !Number.isNaN(new Date(value).getTime())));

    if (!ok) {
      throw new Error(
        `[${slug}] Frontmatter key "${key}" should be ${expected}, got ${JSON.stringify(value)}`
      );
    }
  }
}
