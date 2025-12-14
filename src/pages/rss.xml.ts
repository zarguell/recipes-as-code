import rss from "@astrojs/rss";
import { readdir } from "fs/promises";
import { resolve } from "path";
import { readFileSync } from "fs";
import { Recipe } from "@tmlmt/cooklang-parser";

export async function GET(context: any) {
  const recipesDir = resolve("recipes");
  const files = await readdir(recipesDir);
  const cookFiles = files.filter((f) => f.endsWith(".cook"));

  const items = await Promise.all(
    cookFiles.map(async (file) => {
      const content = readFileSync(resolve(recipesDir, file), "utf-8");
      const recipe = new Recipe(content);
      const slug = file.replace(".cook", "");
      
      const siteUrl = context.site || "https://zarguell.github.io";

      return {
        title: recipe.metadata.title || slug,
        description: recipe.metadata.description || "",
        link: `/recipes/${slug}/`,
        pubDate: new Date(recipe.metadata.date || Date.now()),
        customData: [
          `oklang:recipe xmlns:cooklang="https://cooklang.org/ns/federation">`,
          `  oklang:name>${escapeXml(recipe.metadata.title || slug)}</cooklang:name>`,
          `  oklang:url>${siteUrl}/recipes/${slug}/</cooklang:url>`,
          `  oklang:image>${escapeXml(recipe.metadata.image || "")}</cooklang:image>`,
          `  oklang:servings>${escapeXml(recipe.metadata.servings || "")}</cooklang:servings>`,
          `  oklang:cook-time>${escapeXml(recipe.metadata["cook-time"] || "")}</cooklang:cook-time>`,
          `  oklang:prep-time>${escapeXml(recipe.metadata["prep-time"] || "")}</cooklang:prep-time>`,
          `  oklang:total-time>${escapeXml(recipe.metadata["total-time"] || "")}</cooklang:total-time>`,
          `  oklang:raw-url>${siteUrl}/recipes/${slug}.cook</cooklang:raw-url>`,
          `</cooklang:recipe>`
        ].join('\n'),
      };
    })
  );

  return rss({
    title: "My Recipes",
    description: "A collection of recipes",
    site: context.site || "https://zarguell.github.io",
    items,
    xmlns: {
      cooklang: "https://cooklang.org/ns/federation",
    },
  });
}

function escapeXml(unsafe: string): string {
  if (!unsafe) return "";
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
