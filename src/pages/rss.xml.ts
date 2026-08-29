import type { APIContext } from 'astro';
import { getAllRecipes } from '../lib/recipes';

export async function GET({ site }: APIContext) {
  const base = import.meta.env.BASE_URL;
  const siteUrl = site; // Astro passes configured site as a URL.

  const channelTitle = process.env.PUBLIC_RSS_TITLE ?? "My Recipes";
  const channelDescription =
    process.env.PUBLIC_RSS_DESCRIPTION ??
    "A collection of recipes in CookLang format";

  // Single shared loading pipeline — frontmatter titles/descriptions/dates
  // are merged exactly like on every other page. Recipes without an
  // explicit date fall back to the file's mtime instead of "now" (which
  // used to make every recipe look freshly published on every deploy).
  const items = getAllRecipes()
    .map((recipe) => ({
      ...recipe,
      pubDate: recipe.parsed.metadata?.date
        ? new Date(recipe.parsed.metadata.date)
        : new Date(recipe.modifiedTime),
    }))
    .sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime())
    .map((recipe) => {
      const title = recipe.parsed.metadata.title || recipe.slug;
      const description = recipe.parsed.metadata.description || "";

      // Build absolute URL: <site> + <base> + recipes/<slug>/
      const recipePath = `${base}recipes/${recipe.slug}/`;
      const recipeUrl = new URL(recipePath, siteUrl).toString();

      return `    <item>
      <title>${escapeXml(title)}</title>
      <description>${escapeXml(description)}</description>
      <link>${recipeUrl}</link>
      <guid isPermaLink="true">${recipeUrl}</guid>
      <pubDate>${recipe.pubDate.toUTCString()}</pubDate>
    </item>`;
    });

  // Channel <link> should also be absolute.
  const channelLink = new URL(base, siteUrl).toString();

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(channelTitle)}</title>
    <description>${escapeXml(channelDescription)}</description>
    <link>${channelLink}</link>
    <language>en-us</language>
${items.join("\n")}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
    },
  });
}

function escapeXml(str: any) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
