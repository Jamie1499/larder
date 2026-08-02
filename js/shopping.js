import { normalizeUnit, formatQty, formatIngredient } from "./ingredients.js";

// ---------- Shopping list aggregation ----------
export const CATEGORY_ORDER = [
  "Fruit & Veg", "Meat & Fish", "Dairy & Eggs", "Bakery", "Store Cupboard", "Frozen", "Other",
];

const CATEGORY_RULES = [
  // Checked before Fruit & Veg so spice/powder forms (e.g. "chili powder",
  // "black pepper") don't get caught by broader fresh-produce keywords below.
  ["Store Cupboard", [
    "flour", "sugar", "salt", "oil", "vinegar", "rice", "pasta", "spaghetti", "noodle",
    "stock", "sauce", "salsa", "honey", "oats", "cumin", "paprika", "cinnamon", "spice",
    "powder", "ground", "dried", "black pepper", "oregano", "bay leaf", "beans", "lentil",
    "chickpea", "ketchup", "mustard", "mayonnaise", "jam", "syrup", "cereal", "biscuit",
    "chocolate", "vanilla", "baking powder", "yeast", "tin", "can of", "puree", "coconut milk",
  ]],
  ["Fruit & Veg", [
    "onion", "garlic", "tomato", "potato", "carrot", "bell pepper", "red pepper",
    "green pepper", "yellow pepper", "lettuce", "spinach", "cucumber", "mushroom",
    "avocado", "lemon", "lime", "apple", "banana", "berry", "berries", "grape",
    "broccoli", "celery", "ginger", "chilli pepper", "chili pepper", "fresh chilli",
    "fresh chili", "jalapeno", "courgette", "aubergine", "leek", "kale", "basil",
    "coriander", "parsley", "mint", "thyme", "rosemary", "sage", "chive", "cabbage",
    "cauliflower", "sweetcorn", "corn", "squash", "pumpkin", "beetroot", "radish",
    "shallot", "fruit", "veg",
  ]],
  ["Meat & Fish", [
    "chicken", "beef", "pork", "lamb", "bacon", "sausage", "mince", "turkey", "fish",
    "salmon", "prawn", "shrimp", "tuna", "cod", "ham", "steak", "meat", "chorizo",
  ]],
  ["Dairy & Eggs", [
    "milk", "cheese", "butter", "cream", "yogurt", "yoghurt", "egg", "parmesan",
    "mozzarella", "cheddar",
  ]],
  ["Bakery", [
    "bread", "tortilla", "roll", "bun", "pitta", "baguette", "bagel", "naan", "pastry", "dough",
  ]],
];

export function categorizeIngredient(name) {
  const n = name.toLowerCase();
  if (/\bfrozen\b/.test(n)) return "Frozen";
  for (const [category, keywords] of CATEGORY_RULES) {
    if (keywords.some((k) => n.includes(k))) return category;
  }
  return "Other";
}

export function buildShoppingList(recipes, selectedIds) {
  const items = new Map(); // key -> {name, unit, qty, hasQty, rawFallback, sources}

  recipes
    .filter((r) => selectedIds.has(r.id))
    .forEach((r) => {
      r.ingredients.forEach((ing) => {
        const unit = normalizeUnit(ing.unit);
        const nameKey = ing.name.trim().toLowerCase();
        const hasQty = ing.qty !== null && ing.qty !== undefined;
        const key = `${nameKey}|${unit}`;

        if (!items.has(key)) {
          items.set(key, {
            name: ing.name,
            unit,
            qty: hasQty ? ing.qty : null,
            hasQty,
            rawFallback: hasQty ? [] : [formatIngredient(ing)],
            sources: new Set([r.title]),
          });
        } else {
          const item = items.get(key);
          item.sources.add(r.title);
          if (hasQty && item.hasQty) {
            item.qty += ing.qty;
          } else if (!hasQty) {
            item.rawFallback.push(formatIngredient(ing));
          } else if (hasQty && !item.hasQty) {
            // Mixed: some entries had qty, some didn't — keep as separate fallback note
            item.rawFallback.push(formatIngredient(ing));
          }
        }
      });
    });

  return [...items.entries()]
    .map(([key, item]) => {
      let label;
      if (item.hasQty) {
        label = `${formatQty(item.qty)}${item.unit ? " " + item.unit : ""} ${item.name}`.trim();
        if (item.rawFallback.length) label += ` (+ ${item.rawFallback.join(", ")})`;
      } else if (item.rawFallback.length) {
        label = item.rawFallback.join(" + ");
      } else {
        label = item.name;
      }
      return { key, label, sources: [...item.sources], category: categorizeIngredient(item.name) };
    })
    .sort((a, b) => a.label.localeCompare(b.label));
}
