/**
 * Collections ("cookbooks") — static saved filters.
 *
 * Defined in collections.yml at the project root; each collection is a
 * named cross-section of the recipe library (by tags and/or category),
 * rendered at /collections/<slug>/. The static equivalent of Mealie's
 * cookbooks / Tandoor's books — no database required.
 */

import { existsSync, readFileSync } from "node:fs";
import * as yaml from "js-yaml";
import { slugifyTag } from "./recipes";

export interface CollectionDef {
  /** Display name. */
  name: string;
  /** URL slug (generated from name when omitted). */
  slug: string;
  description?: string;
  /** Recipe matches when it has ANY of these tags (case-insensitive). */
  tags?: string[];
  /** Recipe matches when category equals this (case-insensitive). */
  category?: string;
}

export interface ResolvedCollection extends CollectionDef {
  slug: string;
}

const CONFIG_PATH = "collections.yml";

export function loadCollections(): ResolvedCollection[] {
  if (!existsSync(CONFIG_PATH)) return [];

  let raw: any;
  try {
    raw = yaml.load(readFileSync(CONFIG_PATH, "utf-8"));
  } catch (e) {
    throw new Error(`collections.yml is not valid YAML: ${e}`);
  }

  const list = raw?.collections;
  if (list === undefined) return [];
  if (!Array.isArray(list)) {
    throw new Error('collections.yml must have a "collections" list');
  }

  const seen = new Set<string>();
  return list.map((entry: any, i: number) => {
    if (!entry || typeof entry.name !== "string") {
      throw new Error(`collections.yml entry #${i + 1} needs a "name"`);
    }
    const slug = (typeof entry.slug === "string" && entry.slug) || slugifyTag(entry.name);
    if (seen.has(slug)) {
      throw new Error(`collections.yml has duplicate slug "${slug}"`);
    }
    seen.add(slug);

    for (const key of Object.keys(entry)) {
      if (!["name", "slug", "description", "tags", "category"].includes(key)) {
        console.warn(`collections.yml entry "${entry.name}": unknown key "${key}"`);
      }
    }

    return {
      name: entry.name,
      slug,
      description: typeof entry.description === "string" ? entry.description : undefined,
      tags: Array.isArray(entry.tags) ? entry.tags.map(String) : undefined,
      category: typeof entry.category === "string" ? entry.category : undefined,
    };
  });
}

/** Does a recipe (parsed metadata) match a collection filter? */
export function recipeMatches(metadata: any, collection: CollectionDef): boolean {
  const meta = metadata ?? {};
  let matched = false;

  if (collection.tags?.length) {
    const tags: string[] = (meta.tags || []).map((t: string) => t.toLowerCase());
    if (collection.tags.some((t) => tags.includes(t.toLowerCase()))) matched = true;
  }
  if (collection.category) {
    if (typeof meta.category === "string" && meta.category.toLowerCase() === collection.category.toLowerCase()) {
      matched = true;
    }
  }

  return matched;
}
