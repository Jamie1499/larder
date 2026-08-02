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

// Unicode "vulgar fraction" characters (½, ¼, ...) show up constantly in real
// recipe sites and OCR text but aren't digits our regexes recognise — convert
// them to plain "n/d" text first so quantity detection actually sees them.
const VULGAR_FRACTIONS = {
  "¼": "1/4", "½": "1/2", "¾": "3/4",
  "⅓": "1/3", "⅔": "2/3",
  "⅕": "1/5", "⅖": "2/5", "⅗": "3/5", "⅘": "4/5",
  "⅙": "1/6", "⅚": "5/6",
  "⅐": "1/7",
  "⅛": "1/8", "⅜": "3/8", "⅝": "5/8", "⅞": "7/8",
  "⅑": "1/9",
  "⅒": "1/10",
};
const VULGAR_FRACTION_CHARS = "¼½¾⅓⅔⅕⅖⅗⅘⅙⅚⅐⅛⅜⅝⅞⅑⅒";

export function normalizeFractionText(str) {
  return (str || "")
    // "1½" (mixed number, no space) -> "1 1/2"
    .replace(new RegExp(`(\\d)\\s*([${VULGAR_FRACTION_CHARS}])`, "g"), (_, whole, frac) => `${whole} ${VULGAR_FRACTIONS[frac]}`)
    // any remaining standalone fraction char, e.g. leading "½ onion" -> "1/2 onion"
    .replace(new RegExp(`[${VULGAR_FRACTION_CHARS}]`, "g"), (frac) => VULGAR_FRACTIONS[frac]);
}

// Parses free-text quantity input like "1 1/2", "1/2", "2.5" into a decimal.
export function parseQtyInput(str) {
  const trimmed = normalizeFractionText((str || "").trim());
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

// Bare unit words that are ambiguous as a lone leading word ("Whole milk" is
// an ingredient name, not "1 whole" + "milk") are excluded from the
// implied-quantity-1 heuristic below.
const AMBIGUOUS_LEADING_UNITS = ["whole"];

// Legacy free-text parser, used only to migrate recipes saved before the
// structured ingredient editor existed (raw strings like "2 cups flour").
// Slices the recognised qty/unit prefix off the front rather than
// re-joining the remainder, so punctuation/spacing in the name (e.g.
// "good-quality sausages") survives untouched.
export function parseLegacyIngredientLine(raw) {
  const line = normalizeFractionText(raw.trim());

  let qty = null;
  let rest = line;
  const qtyMatch = line.match(/^(?:\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?)/);
  if (qtyMatch) {
    qty = parseQtyInput(qtyMatch[0]);
    rest = line.slice(qtyMatch[0].length).trimStart();
  }

  let unit = "";
  const unitMatch = rest.match(/^[a-zA-Z]+\b/);
  if (unitMatch) {
    const word = unitMatch[0].toLowerCase();
    const canImplyQty = qty !== null || !AMBIGUOUS_LEADING_UNITS.includes(word);
    if (UNITS.includes(word) && canImplyQty) {
      unit = normalizeUnit(word);
      rest = rest.slice(unitMatch[0].length).trimStart();
      if (qty === null) qty = 1;
    }
  }

  return { qty, unit, name: (rest || line).trim() };
}

// Common cooking-instruction verbs — a line opening with one of these is
// almost always a method step even when short and unpunctuated
// ("Bake for 20 minutes", "Mix everything together").
const STEP_VERBS = [
  "preheat", "heat", "cook", "bake", "roast", "grill", "fry", "saute", "sauté",
  "boil", "simmer", "steam", "mix", "stir", "whisk", "fold", "combine", "blend",
  "add", "pour", "sprinkle", "season", "drizzle", "garnish", "serve", "cover",
  "remove", "drain", "chop", "slice", "dice", "mince", "peel", "cut", "place",
  "put", "transfer", "arrange", "spread", "layer", "top", "set", "turn",
  "reduce", "increase", "continue", "repeat", "divide", "wrap", "refrigerate",
  "freeze", "warm", "melt", "mash", "discard", "taste", "adjust", "check",
  "knead", "rest", "let", "allow", "line", "grease", "preheat",
];

// Guesses whether a line of scanned/imported text is an ingredient or a
// method step, so photo/URL imports can auto-fill the right field instead of
// requiring the user to place every line by hand.
export function classifyLine(line) {
  const trimmed = normalizeFractionText(line.trim());
  const hasLeadingQty = /^(?:\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?)\b/.test(trimmed);
  const hasUnitWord = UNITS.some((u) => new RegExp(`\\b${u}\\b`, "i").test(trimmed));
  const startsWithStepVerb = STEP_VERBS.some((v) => new RegExp(`^${v}\\b`, "i").test(trimmed));
  const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
  const looksLikeSentence = /[.!]\s*$/.test(trimmed) || wordCount > 12;

  if (hasLeadingQty) return "ingredient";
  if (startsWithStepVerb || looksLikeSentence) return "step";
  if (hasUnitWord) return "ingredient";
  if (wordCount <= 6) return "ingredient";
  return "step";
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
