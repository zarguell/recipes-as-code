import { readdir } from "fs/promises";
import { resolve } from "path";
import { readFileSync } from "fs";
import { Recipe } from "@tmlmt/cooklang-parser";

export async function GET() {
  const recipesDir = resolve("recipes");
  const files = await readdir(recipesDir);
  const cookFiles = files.filter((f) => f.endsWith(".cook"));

  const items = [];
  
  for (const file of cookFiles) {
    const slug = file.replace(".cook", "");
    const content = readFileSync(resolve(recipesDir, file), "utf-8");
    
    let recipe;
    try {
      recipe = new Recipe(content);
    } catch (error) {
      console.error(`Error parsing ${file}:`, error.message);
      continue;
    }
    
    const title = recipe.metadata.title || slug;
    const description = recipe.metadata.description || "";
    const pubDate = recipe.metadata.date ? new Date(recipe.metadata.date).toUTCString() : new Date().toUTCString();
    
    items.push(`    <item>
      <title>${escapeXml(title)}</title>
      <description>${escapeXml(description)}</description>
      <link>https://zarguell.github.io/recipes-as-code/recipes/${slug}/</link>
      <guid isPermaLink="true">https://zarguell.github.io/recipes-as-code/recipes/${slug}/</guid>
      <pubDate>${pubDate}</pubDate>
    </item>`);
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>My Recipes</title>
    <description>A collection of recipes in CookLang format</description>
    <link>https://zarguell.github.io/recipes-as-code/</link>
    <language>en-us</language>
${items.join('\n')}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8'
    }
  });
}

function escapeXml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
