// ---------- Storage ----------
const STORAGE_KEY = "recipeBox.recipes";
const SELECTION_KEY = "recipeBox.shoppingSelection";
const CHECKED_KEY = "recipeBox.shoppingChecked";

export function loadRecipes() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

export function saveRecipes(recipes) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(recipes));
}

export function loadSelection() {
  try {
    return new Set(JSON.parse(localStorage.getItem(SELECTION_KEY)) || []);
  } catch {
    return new Set();
  }
}

export function saveSelection(set) {
  localStorage.setItem(SELECTION_KEY, JSON.stringify([...set]));
}

export function loadChecked() {
  try {
    return new Set(JSON.parse(localStorage.getItem(CHECKED_KEY)) || []);
  } catch {
    return new Set();
  }
}

export function saveChecked(set) {
  localStorage.setItem(CHECKED_KEY, JSON.stringify([...set]));
}
