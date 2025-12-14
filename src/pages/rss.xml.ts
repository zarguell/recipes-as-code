import rss from "@astrojs/rss";
import { readdir } from "fs/promises";
import { resolve } from "path";
import { readFileSync } from "fs";
import { Recipe } from "@tmlmt/cooklang-parser";
import matter from "gray-matter";

export async function GET(context: any) {
  const recipesDir = resolve("recipes");
  const files = await readdir(recipesDir);
  const cookFiles = files.filter((f) => f.endsWith(".cook"));

  const items = await Promise.all(
    cookFiles.map(async (file) => {
      const content = readFileSync(resolve(recipesDir, file), "utf-8");
      const { data: frontmatter, content: cookContent } = matter(content);
      const recipe = new Recipe(cookContent);
      const slug = file.replace(".cook", "");

      return {
        title: frontmatter.title || slug,
        description: frontmatter.description || recipe.metadata?.description || "",
        link: `/recipes/${slug}/`,
        pubDate: new Date(frontmatter.date || Date.now()),
        // CookLang Federation extensions
        customData: `
          oklang:recipe>
            oklang:name>${frontmatter.title || slug}</cooklang:name>
            oklang:url>https://yoursite.com/recipes/${slug}/</cooklang:url>
            oklang:image>${frontmatter.image || ""}</cooklang:image>
            oklang:servings>${recipe.metadata?.servings || ""}</cooklang:servings>
            oklang:cook_time>${recipe.metadata?.["cook_time"] || ""}</cooklang:cook_time>
            oklang:prep_time>${recipe.metadata?.["prep_time"] || ""}</cooklang:prep_time>
            oklang:total_time>${recipe.metadata?.["total_time"] || ""}</cooklang:total_time>
            oklang:raw-url>https://yoursite.com/recipes/${slug}.cook</cooklang:raw-url>
          </cooklang:recipe>
        `,
      };
    })
  );

  return rss({
    title: "My Recipes",
    description: "A collection of recipes",
    site: context.site || "https://example.com",
    items,
    customData: `
      <language>en-us</language>
      oklang:federation>
        oklang:name>My Recipe Site</cooklang:name>
        oklang:description>A collection of delicious recipes</cooklang:description>
      </cooklang:federation>
    `,
  });
}
