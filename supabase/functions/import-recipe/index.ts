// Supabase Edge Function: import-recipe
// Paste this into Supabase dashboard -> Edge Functions -> New function ("import-recipe").
// Fetches a recipe URL server-side (avoids browser CORS) and extracts the
// page's schema.org Recipe JSON-LD, returning { title, ingredients, steps, image }.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function collectRecipes(node: any, found: any[]) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    node.forEach((n) => collectRecipes(n, found));
    return;
  }
  const type = node["@type"];
  const isRecipe = type === "Recipe" || (Array.isArray(type) && type.includes("Recipe"));
  if (isRecipe) found.push(node);
  if (node["@graph"]) collectRecipes(node["@graph"], found);
}

// schema.org "image" can be a plain URL string, an array of either, or an
// ImageObject ({ url: "..." }) — pick the first usable URL out of any shape.
function extractImage(image: any): string {
  if (!image) return "";
  if (typeof image === "string") return image;
  if (Array.isArray(image)) return extractImage(image[0]);
  if (typeof image === "object" && image.url) return String(image.url);
  return "";
}

function flattenInstructions(instr: any): string[] {
  if (!instr) return [];
  if (typeof instr === "string") {
    return instr
      .split(/\n+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (Array.isArray(instr)) {
    return instr
      .flatMap((item) => {
        if (typeof item === "string") return [item.trim()];
        if (item.itemListElement) return flattenInstructions(item.itemListElement);
        if (item.text) return [String(item.text).trim()];
        return [];
      })
      .filter(Boolean);
  }
  return [];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { url } = await req.json();
    if (!url) throw new Error("Missing url");

    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; LarderRecipeImport/1.0)" },
    });
    if (!res.ok) throw new Error(`Couldn't fetch that page (status ${res.status}).`);
    const html = await res.text();

    const scriptMatches = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
    const found: any[] = [];
    for (const m of scriptMatches) {
      try {
        collectRecipes(JSON.parse(m[1].trim()), found);
      } catch {
        // skip malformed JSON-LD block
      }
    }
    if (!found.length) throw new Error("Couldn't find recipe data on that page.");

    const recipe = found[0];
    const title = recipe.name || "";
    const ingredients = Array.isArray(recipe.recipeIngredient)
      ? recipe.recipeIngredient.map((i: any) => String(i).trim()).filter(Boolean)
      : [];
    const steps = flattenInstructions(recipe.recipeInstructions);
    const image = extractImage(recipe.image);

    return new Response(JSON.stringify({ title, ingredients, steps, image }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || "Import failed." }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
