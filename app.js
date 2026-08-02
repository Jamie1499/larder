// ---------- Storage ----------
const STORAGE_KEY = "recipeBox.recipes";
const SELECTION_KEY = "recipeBox.shoppingSelection";
const CHECKED_KEY = "recipeBox.shoppingChecked";

function loadRecipes() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveRecipes(recipes) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(recipes));
}

function loadSelection() {
  try {
    return new Set(JSON.parse(localStorage.getItem(SELECTION_KEY)) || []);
  } catch {
    return new Set();
  }
}

function saveSelection(set) {
  localStorage.setItem(SELECTION_KEY, JSON.stringify([...set]));
}

function loadChecked() {
  try {
    return new Set(JSON.parse(localStorage.getItem(CHECKED_KEY)) || []);
  } catch {
    return new Set();
  }
}

function saveChecked(set) {
  localStorage.setItem(CHECKED_KEY, JSON.stringify([...set]));
}

// ---------- Ingredient parsing / normalizing ----------
// Ingredients are stored as structured objects: { qty: number|null, unit: string, name: string }
// so the shopping list can combine amounts exactly instead of guessing from free text.

// Every unit recognisable during legacy free-text migration — kept in sync
// with the <select> options in index.html plus their common written-out forms.
const UNITS = [
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

function fractionToDecimal(token) {
  if (token.includes("/")) {
    const [num, den] = token.split("/").map(Number);
    if (den) return num / den;
  }
  return parseFloat(token);
}

// Parses free-text quantity input like "1 1/2", "1/2", "2.5" into a decimal.
function parseQtyInput(str) {
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

function normalizeUnit(unit) {
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

function formatQty(qty) {
  if (qty === null || qty === undefined) return "";
  return Number.isInteger(qty) ? String(qty) : qty.toFixed(2).replace(/\.?0+$/, "");
}

function formatIngredient(ing) {
  const parts = [];
  if (ing.qty !== null && ing.qty !== undefined) parts.push(formatQty(ing.qty));
  if (ing.unit) parts.push(ing.unit);
  parts.push(ing.name);
  return parts.join(" ").trim();
}

// Legacy free-text parser, used only to migrate recipes saved before the
// structured ingredient editor existed (raw strings like "2 cups flour").
function parseLegacyIngredientLine(raw) {
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
function migrateRecipes(recipes) {
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

// ---------- Shopping list aggregation ----------
const CATEGORY_ORDER = [
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

function categorizeIngredient(name) {
  const n = name.toLowerCase();
  if (/\bfrozen\b/.test(n)) return "Frozen";
  for (const [category, keywords] of CATEGORY_RULES) {
    if (keywords.some((k) => n.includes(k))) return category;
  }
  return "Other";
}

function buildShoppingList(recipes, selectedIds) {
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

// ---------- Seed data (first run only) ----------
function ing(qty, unit, name) {
  return { qty, unit, name };
}

function seedIfEmpty() {
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

// ---------- App state ----------
let recipes = [];
let selection = new Set();
let checked = new Set();
let currentView = "recipes"; // "recipes" | "detail" | "shopping"
let currentRecipeId = null;
let searchTerm = "";
let tagFilter = "";

const app = document.getElementById("app");
const shoppingCountBadge = document.getElementById("shopping-count");

function init() {
  seedIfEmpty();
  recipes = loadRecipes();
  if (migrateRecipes(recipes)) saveRecipes(recipes);
  selection = loadSelection();
  checked = loadChecked();

  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      currentView = btn.dataset.view;
      currentRecipeId = null;
      render();
    });
  });

  setupModal();
  render();
}

function updateTabs() {
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.view === currentView);
  });
  shoppingCountBadge.textContent = selection.size;
  shoppingCountBadge.classList.toggle("hidden", selection.size === 0);
}

function render() {
  updateTabs();
  if (currentView === "recipes") renderRecipeList();
  else if (currentView === "detail") renderRecipeDetail();
  else if (currentView === "shopping") renderShoppingList();
}

// ---------- Recipe list view ----------
function getAllTags() {
  const tagSet = new Set();
  recipes.forEach((r) => r.tags.forEach((t) => tagSet.add(t)));
  return [...tagSet].sort();
}

function getFilteredRecipes() {
  return recipes.filter((r) => {
    const term = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !term ||
      r.title.toLowerCase().includes(term) ||
      r.ingredients.some((i) => i.name.toLowerCase().includes(term)) ||
      r.tags.some((t) => t.toLowerCase().includes(term));
    const matchesTag = !tagFilter || r.tags.includes(tagFilter);
    return matchesSearch && matchesTag;
  });
}

function renderRecipeList() {
  const filtered = getFilteredRecipes();
  const tags = getAllTags();

  app.innerHTML = `
    <div class="toolbar">
      <input type="text" class="search-input" id="search-input" placeholder="Search recipes or ingredients..." value="${escapeAttr(searchTerm)}" />
      <select class="tag-filter" id="tag-filter">
        <option value="">All tags</option>
        ${tags.map((t) => `<option value="${escapeAttr(t)}" ${t === tagFilter ? "selected" : ""}>${escapeHtml(t)}</option>`).join("")}
      </select>
      <button class="btn primary" id="add-recipe-btn">+ New Recipe</button>
    </div>
    ${
      filtered.length === 0
        ? `<div class="empty-state">${recipes.length === 0 ? "No recipes yet. Add your first one!" : "No recipes match your search."}</div>`
        : `<div class="recipe-grid">${filtered.map(renderRecipeCard).join("")}</div>`
    }
  `;

  document.getElementById("search-input").addEventListener("input", (e) => {
    searchTerm = e.target.value;
    renderRecipeListOnly();
  });
  document.getElementById("tag-filter").addEventListener("change", (e) => {
    tagFilter = e.target.value;
    renderRecipeListOnly();
  });
  document.getElementById("add-recipe-btn").addEventListener("click", () => openModal());

  attachCardListeners();
}

function renderRecipeListOnly() {
  renderRecipeList();
  const input = document.getElementById("search-input");
  input.focus();
  input.setSelectionRange(input.value.length, input.value.length);
}

function renderRecipeCard(r) {
  const isSelected = selection.has(r.id);
  return `
    <div class="recipe-card" data-id="${r.id}">
      <div class="recipe-card-top">
        <h3>${escapeHtml(r.title)}</h3>
        <label class="checkbox-row" title="Add to shopping list" onclick="event.stopPropagation()">
          <input type="checkbox" class="select-check" data-id="${r.id}" ${isSelected ? "checked" : ""} />
        </label>
      </div>
      <div class="recipe-meta">${r.servings} servings · ${r.ingredients.length} ingredients</div>
      <div class="tag-list">${r.tags.map((t) => `<span class="tag-chip">${escapeHtml(t)}</span>`).join("")}</div>
    </div>
  `;
}

function attachCardListeners() {
  document.querySelectorAll(".recipe-card").forEach((card) => {
    card.addEventListener("click", () => {
      currentRecipeId = card.dataset.id;
      currentView = "detail";
      render();
    });
  });
  document.querySelectorAll(".select-check").forEach((cb) => {
    cb.addEventListener("change", (e) => {
      const id = e.target.dataset.id;
      if (e.target.checked) selection.add(id);
      else selection.delete(id);
      saveSelection(selection);
      updateTabs();
    });
  });
}

// ---------- Recipe detail view ----------
function renderRecipeDetail() {
  const r = recipes.find((x) => x.id === currentRecipeId);
  if (!r) {
    currentView = "recipes";
    render();
    return;
  }

  app.innerHTML = `
    <button class="back-link" id="back-btn">← Back to recipes</button>
    <div class="detail-header">
      <div>
        <h2 style="margin:0 0 0.25rem;">${escapeHtml(r.title)}</h2>
        <div class="recipe-meta">${r.servings} servings</div>
        <div class="tag-list" style="margin-top:0.5rem;">${r.tags.map((t) => `<span class="tag-chip">${escapeHtml(t)}</span>`).join("")}</div>
      </div>
      <div class="detail-actions">
        <label class="checkbox-row btn" style="cursor:pointer;">
          <input type="checkbox" id="detail-select" ${selection.has(r.id) ? "checked" : ""} /> Add to list
        </label>
        <button class="btn" id="edit-btn">Edit</button>
        <button class="btn danger" id="delete-btn">Delete</button>
      </div>
    </div>
    <div class="detail-grid">
      <div class="detail-section">
        <h3>Ingredients</h3>
        <ul class="ingredient-list">
          ${r.ingredients.map((i) => `<li>${escapeHtml(formatIngredient(i))}</li>`).join("")}
        </ul>
      </div>
      <div class="detail-section">
        <h3>Steps</h3>
        <ol class="step-list">
          ${r.steps.map((s) => `<li>${escapeHtml(s)}</li>`).join("")}
        </ol>
      </div>
    </div>
    ${r.notes ? `<div class="notes-box"><strong>Notes:</strong> ${escapeHtml(r.notes)}</div>` : ""}
  `;

  document.getElementById("back-btn").addEventListener("click", () => {
    currentView = "recipes";
    render();
  });
  document.getElementById("edit-btn").addEventListener("click", () => openModal(r));
  document.getElementById("delete-btn").addEventListener("click", () => {
    if (confirm(`Delete "${r.title}"? This can't be undone.`)) {
      recipes = recipes.filter((x) => x.id !== r.id);
      saveRecipes(recipes);
      selection.delete(r.id);
      saveSelection(selection);
      currentView = "recipes";
      render();
    }
  });
  document.getElementById("detail-select").addEventListener("change", (e) => {
    if (e.target.checked) selection.add(r.id);
    else selection.delete(r.id);
    saveSelection(selection);
    updateTabs();
  });
}

// ---------- Shopping list view ----------
function renderShoppingList() {
  const selectedRecipes = recipes.filter((r) => selection.has(r.id));
  const items = buildShoppingList(recipes, selection);
  const outstandingItems = items.filter((item) => !checked.has(item.key));

  const grouped = {};
  items.forEach((item) => {
    (grouped[item.category] = grouped[item.category] || []).push(item);
  });

  const progressText =
    items.length === 0
      ? ""
      : outstandingItems.length === 0
      ? `All ${items.length} items checked off — nice one.`
      : `${outstandingItems.length} of ${items.length} items still needed`;

  app.innerHTML = `
    <div class="toolbar" style="justify-content: space-between;">
      <div class="recipe-meta">${selectedRecipes.length ? `From: ${selectedRecipes.map((r) => r.title).join(", ")}` : ""}</div>
      <div style="display:flex; gap:0.5rem;">
        ${outstandingItems.length ? `<button class="btn primary" id="copy-list-btn">Copy list</button>` : ""}
        ${selectedRecipes.length ? `<button class="btn ghost" id="clear-list-btn">Clear selection</button>` : ""}
      </div>
    </div>
    ${
      items.length === 0
        ? `<div class="empty-state">No recipes selected. Check recipes on the Recipes tab to build a shopping list.</div>`
        : `<div class="shopping-progress">${progressText} — copy the list and paste it into your supermarket's search or "quick add list" box (Ocado, Tesco, Sainsbury's, Waitrose, and Asda all support this) to add items to your basket.</div>
           ${CATEGORY_ORDER.filter((cat) => grouped[cat] && grouped[cat].length)
             .map(
               (cat) => `
             <div class="shopping-category">
               <h3>${escapeHtml(cat)}</h3>
               <ul class="shopping-list">
                 ${grouped[cat]
                   .map(
                     (item) => `
                   <li class="shopping-item ${checked.has(item.key) ? "checked" : ""}" data-key="${escapeAttr(item.key)}">
                     <input type="checkbox" ${checked.has(item.key) ? "checked" : ""} />
                     <span>${escapeHtml(item.label)}</span>
                   </li>`
                   )
                   .join("")}
               </ul>
             </div>`
             )
             .join("")}`
    }
  `;

  if (selectedRecipes.length) {
    document.getElementById("clear-list-btn").addEventListener("click", () => {
      selection.clear();
      checked.clear();
      saveSelection(selection);
      saveChecked(checked);
      render();
    });
  }

  if (outstandingItems.length) {
    document.getElementById("copy-list-btn").addEventListener("click", async (e) => {
      const text = outstandingItems.map((item) => item.label).join("\n");
      try {
        await navigator.clipboard.writeText(text);
        const btn = e.currentTarget;
        const original = btn.textContent;
        btn.textContent = "Copied!";
        setTimeout(() => {
          btn.textContent = original;
        }, 1500);
      } catch {
        alert("Couldn't copy automatically — here's your list:\n\n" + text);
      }
    });
  }

  document.querySelectorAll(".shopping-item").forEach((el) => {
    el.addEventListener("click", () => {
      const key = el.dataset.key;
      if (checked.has(key)) checked.delete(key);
      else checked.add(key);
      saveChecked(checked);
      render();
    });
  });
}

// ---------- Modal (add/edit) ----------
const ingredientRowsEl = () => document.getElementById("ingredient-rows");
const ingredientTemplate = () => document.getElementById("ingredient-row-template");

function addIngredientRow(data) {
  const row = ingredientTemplate().content.firstElementChild.cloneNode(true);
  if (data) {
    row.querySelector(".ing-qty").value = data.qty !== null && data.qty !== undefined ? formatQty(data.qty) : "";
    row.querySelector(".ing-unit").value = data.unit || "";
    row.querySelector(".ing-name").value = data.name || "";
  }
  row.querySelector(".remove-row-btn").addEventListener("click", () => {
    row.remove();
  });
  ingredientRowsEl().appendChild(row);
}

function renderIngredientRows(ingredients) {
  ingredientRowsEl().innerHTML = "";
  if (ingredients && ingredients.length) {
    ingredients.forEach((i) => addIngredientRow(i));
  } else {
    addIngredientRow();
  }
}

function collectIngredientsFromForm() {
  const rows = [...ingredientRowsEl().querySelectorAll(".ingredient-row")];
  return rows
    .map((row) => {
      const qty = parseQtyInput(row.querySelector(".ing-qty").value);
      const unit = normalizeUnit(row.querySelector(".ing-unit").value);
      const name = row.querySelector(".ing-name").value.trim();
      return { qty, unit, name };
    })
    .filter((i) => i.name);
}

// ---------- Voice dictation ----------
let activeRecognition = null;

function stopActiveRecognition() {
  if (activeRecognition) {
    activeRecognition.stop();
    activeRecognition = null;
  }
}

function getSpeechRecognition() {
  return window.SpeechRecognition || window.webkitSpeechRecognition;
}

// Single utterance -> one callback with the final transcript (e.g. dictate a title).
function setupSingleShotMic(button, onResult) {
  const SR = getSpeechRecognition();
  if (!SR) {
    button.disabled = true;
    button.title = "Voice input isn't supported in this browser";
    return;
  }
  let recognition = null;
  button.addEventListener("click", () => {
    if (recognition) {
      recognition.stop();
      return;
    }
    recognition = new SR();
    activeRecognition = recognition;
    recognition.lang = "en-GB";
    recognition.interimResults = false;
    recognition.onresult = (e) => onResult(e.results[0][0].transcript.trim());
    recognition.onerror = () => {
      button.classList.remove("recording");
      recognition = null;
      activeRecognition = null;
    };
    recognition.onend = () => {
      button.classList.remove("recording");
      recognition = null;
      activeRecognition = null;
    };
    button.classList.add("recording");
    recognition.start();
  });
}

// Ongoing dictation -> one callback per completed sentence (e.g. narrate steps one by one).
function setupContinuousMic(button, onFinal) {
  const SR = getSpeechRecognition();
  if (!SR) {
    button.disabled = true;
    button.title = "Voice input isn't supported in this browser";
    return;
  }
  let recognition = null;
  const originalLabel = button.textContent;
  button.addEventListener("click", () => {
    if (recognition) {
      recognition.stop();
      return;
    }
    recognition = new SR();
    activeRecognition = recognition;
    recognition.lang = "en-GB";
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) onFinal(e.results[i][0].transcript.trim());
      }
    };
    recognition.onerror = () => {
      button.classList.remove("recording");
      button.textContent = originalLabel;
      recognition = null;
      activeRecognition = null;
    };
    recognition.onend = () => {
      button.classList.remove("recording");
      button.textContent = originalLabel;
      recognition = null;
      activeRecognition = null;
    };
    button.classList.add("recording");
    button.textContent = "⏹ Stop";
    recognition.start();
  });
}

function appendLine(textarea, line) {
  textarea.value = textarea.value ? textarea.value + "\n" + line : line;
}

// ---------- Photo scanning (on-device OCR) ----------
function resetImportTools() {
  const status = document.getElementById("ocr-status");
  const results = document.getElementById("ocr-results");
  status.classList.add("hidden");
  status.textContent = "";
  results.classList.add("hidden");
  results.innerHTML = "";
  document.getElementById("photo-input").value = "";
}

function buildOcrLine(text) {
  const li = document.createElement("li");
  li.className = "ocr-line";

  const span = document.createElement("span");
  span.textContent = text;

  const ingBtn = document.createElement("button");
  ingBtn.type = "button";
  ingBtn.className = "btn small ghost";
  ingBtn.textContent = "+ Ingredient";
  ingBtn.addEventListener("click", () => {
    addIngredientRow(parseLegacyIngredientLine(text));
    li.classList.add("used");
  });

  const stepBtn = document.createElement("button");
  stepBtn.type = "button";
  stepBtn.className = "btn small ghost";
  stepBtn.textContent = "+ Step";
  stepBtn.addEventListener("click", () => {
    appendLine(document.getElementById("f-steps"), text);
    li.classList.add("used");
  });

  li.append(span, ingBtn, stepBtn);
  return li;
}

async function handlePhotoScan(file) {
  const status = document.getElementById("ocr-status");
  const results = document.getElementById("ocr-results");

  status.classList.remove("hidden");
  status.textContent = "Reading photo… this can take a few seconds.";
  results.classList.add("hidden");
  results.innerHTML = "";

  if (typeof Tesseract === "undefined") {
    status.textContent = "Photo scanning couldn't load (needs an internet connection the first time). Try again once you're online.";
    return;
  }

  try {
    const { data } = await Tesseract.recognize(file, "eng");
    const lines = data.text
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    if (!lines.length) {
      status.textContent = "Couldn't find any readable text in that photo — try a clearer, well-lit shot.";
      return;
    }

    status.textContent = `Found ${lines.length} line${lines.length === 1 ? "" : "s"} — send the useful ones to Ingredients or Steps below.`;
    results.classList.remove("hidden");
    lines.forEach((line) => results.appendChild(buildOcrLine(line)));
  } catch {
    status.textContent = "Something went wrong reading that photo. Try a clearer, well-lit shot.";
  }
}

function setupModal() {
  const modal = document.getElementById("recipe-modal");
  const form = document.getElementById("recipe-form");

  document.getElementById("cancel-btn").addEventListener("click", () => {
    stopActiveRecognition();
    modal.close();
  });
  modal.addEventListener("close", stopActiveRecognition);

  document.getElementById("add-ingredient-btn").addEventListener("click", () => addIngredientRow());

  setupSingleShotMic(document.getElementById("title-mic-btn"), (text) => {
    document.getElementById("f-title").value = text;
  });
  setupSingleShotMic(document.getElementById("voice-ingredient-btn"), (text) => {
    addIngredientRow(parseLegacyIngredientLine(text));
  });
  setupContinuousMic(document.getElementById("steps-mic-btn"), (text) => {
    appendLine(document.getElementById("f-steps"), text);
  });

  document.getElementById("scan-photo-btn").addEventListener("click", () => {
    document.getElementById("photo-input").click();
  });
  document.getElementById("photo-input").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) handlePhotoScan(file);
    e.target.value = "";
  });

  form.addEventListener("submit", (e) => {
    const title = document.getElementById("f-title").value.trim();
    const servings = parseInt(document.getElementById("f-servings").value, 10) || 1;
    const tags = document
      .getElementById("f-tags")
      .value.split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const ingredients = collectIngredientsFromForm();
    const steps = document
      .getElementById("f-steps")
      .value.split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    const notes = document.getElementById("f-notes").value.trim();
    const id = document.getElementById("recipe-id").value;

    if (!title || ingredients.length === 0 || steps.length === 0) {
      e.preventDefault();
      alert("Please fill in a title, at least one ingredient (with a name), and at least one step.");
      return;
    }

    if (id) {
      const idx = recipes.findIndex((r) => r.id === id);
      if (idx !== -1) {
        recipes[idx] = { ...recipes[idx], title, servings, tags, ingredients, steps, notes };
      }
    } else {
      recipes.push({
        id: crypto.randomUUID(),
        title,
        servings,
        tags,
        ingredients,
        steps,
        notes,
        createdAt: Date.now(),
      });
    }
    saveRecipes(recipes);

    setTimeout(() => {
      if (currentView === "detail") {
        currentRecipeId = id || recipes[recipes.length - 1].id;
      }
      render();
    }, 0);
  });
}

function openModal(recipe) {
  const modal = document.getElementById("recipe-modal");
  document.getElementById("modal-title").textContent = recipe ? "Edit Recipe" : "New Recipe";
  document.getElementById("recipe-id").value = recipe ? recipe.id : "";
  document.getElementById("f-title").value = recipe ? recipe.title : "";
  document.getElementById("f-servings").value = recipe ? recipe.servings : 4;
  document.getElementById("f-tags").value = recipe ? recipe.tags.join(", ") : "";
  document.getElementById("f-steps").value = recipe ? recipe.steps.join("\n") : "";
  document.getElementById("f-notes").value = recipe ? recipe.notes || "" : "";
  renderIngredientRows(recipe ? recipe.ingredients : null);
  resetImportTools();
  modal.showModal();
}

// ---------- Utils ----------
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function escapeAttr(str) {
  return escapeHtml(str).replace(/"/g, "&quot;");
}

init();
