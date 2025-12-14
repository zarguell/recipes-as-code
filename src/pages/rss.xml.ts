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
      let recipe;
      
      try {
        recipe = new Recipe(content);
      } catch (error) {
        console.error(`Error parsing ${file}:`, error.message);
        recipe = {
          metadata: { title: file.replace(".cook", "") },
        };
      }
      
      const slug = file.replace(".cook", "");

      return {
        title: recipe.metadata.title || slug,
        description: recipe.metadata.description || "",
        link: `/recipes/${slug}/`,
        pubDate: new Date(recipe.metadata.date || Date.now()),
      };
    })
  );

  return rss({
    title: "My Recipes",
    description: "A collection of recipes",
    site: context.site || "https://zarguell.github.io",
    items,
  });
}
