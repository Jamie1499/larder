// ---------- Ingredient parsing / normalizing ----------
// Ingredients are stored as structured objects: { qty: number|null, unit: string, name: string }
// so the shopping list can combine amounts exactly instead of guessing from free text.

// Every unit recognisable during legacy free-text migration — kept in sync
// with the <select> options in index.html plus their common written-out forms.
export const UNITS = [
  "cup", "cups", "tbsp", "tablespoon", "tablespoons", "tsp", "teaspoon", "teaspoons",
  "dsp", "dessertspoon", "dessertspoons",
  "oz", "ounce", "ounces", "lb", "lbs", "pound", "pounds", "g", "gram", "grams",
  "kg", "kilogram", "kilograms", "ml", "millilitre", "millilitres", "milliliter", "milliliters",
  "l", "litre", "litres", "liter", "liters", "pint", "pints",
  "clove", "cloves", "can", "cans", "tin", "tins", "pinch", "pinches",
  "slice", "slices", "piece", "pieces", "bunch", "bunches", "stick", "sticks",
  "knob", "knobs", "rasher", "rashers", "sprig", "sprigs", "jar", "jars",
  "packet", "packets", "pack", "packs", "handful", "handfuls", "drizzle", "drizzles", "whole",
];

export function fractionToDecimal(token) {
  if (token.includes("/")) {
    const [num, den] = token.split("/").map(Number);
    if (den) return num / den;
  }
  return parseFloat(token);
}

// Parses free-text quantity input like "1 1/2", "1/2", "2.5" into a decimal.
export function parseQtyInput(str) {
  const trimmed = (str || "").trim();
  if (!trimmed) return null;
  if (/^\d+\s+\d+\/\d+$/.test(trimmed)) {
    const [whole, frac] = trimmed.split(/\s+/);
    return parseInt(whole, 10) + fractionToDecimal(frac);
  }
  if (/^\d+\/\d+$/.test(trimmed)) return fractionToDecimal(trimmed);
  const num = parseFloat(trimmed);
  return Number.isNaN(num) ? null : num;
}

export function normalizeUnit(unit) {
  const map = {
    tablespoon: "tbsp", tablespoons: "tbsp",
    teaspoon: "tsp", teaspoons: "tsp",
    dessertspoon: "dsp", dessertspoons: "dsp",
    ounce: "oz", ounces: "oz",
    pound: "lb", pounds: "lb", lbs: "lb",
    gram: "g", grams: "g",
    kilogram: "kg", kilograms: "kg",
    millilitre: "ml", millilitres: "ml", milliliter: "ml", milliliters: "ml",
    litre: "l", litres: "l", liter: "l", liters: "l",
    pints: "pint",
    cups: "cup", cloves: "clove", cans: "can", tin: "can", tins: "can",
    slices: "slice", pieces: "piece", bunches: "bunch",
    sticks: "stick", rashers: "rasher", sprigs: "sprig",
    jars: "jar", packets: "packet", pack: "packet", packs: "packet",
  };
  const clean = (unit || "").trim().toLowerCase();
  if (!clean) return "";
  return map[clean] || clean;
}

export function formatQty(qty) {
  if (qty === null || qty === undefined) return "";
  return Number.isInteger(qty) ? String(qty) : qty.toFixed(2).replace(/\.?0+$/, "");
}

export function formatIngredient(ing) {
  const parts = [];
  if (ing.qty !== null && ing.qty !== undefined) parts.push(formatQty(ing.qty));
  if (ing.unit) parts.push(ing.unit);
  parts.push(ing.name);
  return parts.join(" ").trim();
}

// Legacy free-text parser, used only to migrate recipes saved before the
// structured ingredient editor existed (raw strings like "2 cups flour").
export function parseLegacyIngredientLine(raw) {
  const line = raw.trim();
  const match = line.match(
    /^((?:\d+\s+\d+\/\d+)|(?:\d+\/\d+)|(?:\d+(?:\.\d+)?))?\s*([a-zA-Z]+)?\s*(.*)$/
  );
  let qty = null;
  let unit = "";
  let name = line;

  if (match) {
    const qtyToken = match[1];
    const rest2 = match[2] || "";
    const rest3 = match[3] || "";

    if (qtyToken) {
      qty = parseQtyInput(qtyToken);
      const possibleUnit = rest2.toLowerCase();
      if (UNITS.includes(possibleUnit)) {
        unit = normalizeUnit(possibleUnit);
        name = rest3.trim();
      } else {
        name = [rest2, rest3].filter(Boolean).join(" ").trim();
      }
    } else {
      name = line;
    }
  }

  return { qty, unit, name: (name || line).trim() };
}

// Converts any legacy string-based ingredient lists into structured objects.
// Returns true if the recipe list needed migrating (caller should persist).
export function migrateRecipes(recipes) {
  let changed = false;
  recipes.forEach((r) => {
    if (r.ingredients.some((i) => typeof i === "string")) {
      r.ingredients = r.ingredients.map((i) =>
        typeof i === "string" ? parseLegacyIngredientLine(i) : i
      );
      changed = true;
    }
  });
  return changed;
}
