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
    const image = recipe.metadata.image?.replace(/^["']|["']$/g, '') || "";
    const servings = recipe.metadata.servings || "";
    const prepTime = recipe.metadata["prep-time"] || "";
    const cookTime = recipe.metadata["cook-time"] || "";
    const totalTime = recipe.metadata["total-time"] || "";
    const pubDate = recipe.metadata.date ? new Date(recipe.metadata.date).toUTCString() : new Date().toUTCString();
    
    items.push(`
    <item>
      <title>${escapeXml(title)}</title>
      <description>${escapeXml(description)}</description>
      <link>https://zarguell.github.io/recipes-as-code/recipes/${slug}/</link>
      <guid>https://zarguell.github.io/recipes-as-code/recipes/${slug}/</guid>
      <pubDate>${pubDate}</pubDate>
      oklang:recipe>
        oklang:name>${escapeXml(title)}</cooklang:name>
        oklang:image>${escapeXml(image)}</cooklang:image>
        oklang:servings>${escapeXml(String(servings))}</cooklang:servings>
        oklang:prep-time>${escapeXml(prepTime)}</cooklang:prep-time>
        oklang:cook-time>${escapeXml(cookTime)}</cooklang:cook-time>
        oklang:total-time>${escapeXml(totalTime)}</cooklang:total-time>
        oklang:raw-url>https://zarguell.github.io/recipes-as-code/recipes/${slug}.cook</cooklang:raw-url>
      </cooklang:recipe>
    </item>`);
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:cooklang="https://cooklang.org/ns/federation">
  hannel>
    <title>My Recipes</title>
    <description>A collection of recipes in CookLang format</description>
    <link>https://zarguell.github.io/recipes-as-code/</link>
    <language>en-us</language>
    oklang:federation>
      oklang:name>My Recipe Collection</cooklang:name>
      oklang:description>A curated collection of recipes</cooklang:description>
    </cooklang:federation>
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
