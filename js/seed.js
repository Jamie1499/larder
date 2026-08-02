import { loadRecipes, saveRecipes } from "./storage.js";

// ---------- Seed data (first run only) ----------
function ing(qty, unit, name) {
  return { qty, unit, name };
}

export function seedIfEmpty() {
  if (loadRecipes().length > 0) return;
  const seed = [
    {
      id: crypto.randomUUID(),
      title: "Lemon Garlic Pasta",
      servings: 4,
      tags: ["dinner", "vegetarian", "italian"],
      ingredients: [
        ing(12, "oz", "spaghetti"),
        ing(4, "tbsp", "butter"),
        ing(4, "clove", "garlic"),
        ing(1, "", "lemon"),
        ing(0.5, "cup", "parmesan"),
        ing(1, "tsp", "salt"),
        ing(0.5, "tsp", "black pepper"),
      ],
      steps: [
        "Cook spaghetti in salted boiling water until al dente.",
        "Melt butter in a pan, sauté minced garlic until fragrant.",
        "Zest and juice the lemon into the pan.",
        "Toss cooked pasta with the butter sauce and parmesan.",
        "Season with salt and pepper, serve immediately.",
      ],
      notes: "Reserve a cup of pasta water in case the sauce needs loosening.",
      createdAt: Date.now(),
    },
    {
      id: crypto.randomUUID(),
      title: "Weeknight Chicken Tacos",
      servings: 4,
      tags: ["dinner", "mexican"],
      ingredients: [
        ing(1, "lb", "chicken breast"),
        ing(8, "", "small tortillas"),
        ing(1, "tbsp", "olive oil"),
        ing(1, "tsp", "cumin"),
        ing(1, "tsp", "chili powder"),
        ing(1, "cup", "shredded lettuce"),
        ing(0.5, "cup", "salsa"),
        ing(0.25, "cup", "sour cream"),
      ],
      steps: [
        "Season chicken with cumin and chili powder.",
        "Cook chicken in olive oil over medium-high heat until done, then slice.",
        "Warm tortillas.",
        "Assemble tacos with chicken, lettuce, salsa, and sour cream.",
      ],
      notes: "",
      createdAt: Date.now(),
    },
  ];
  saveRecipes(seed);
}
