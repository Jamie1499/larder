// ---------- App state ----------
// Exported as live bindings so other modules always see the current value.
// Reassignments (as opposed to in-place mutation like .push/.add) must go
// through the setters below, since importers can't reassign a live binding.
export let recipes = [];
export let selection = new Set();
export let checked = new Set();
export let currentView = "recipes"; // "recipes" | "detail" | "shopping"
export let currentRecipeId = null;
export let searchTerm = "";
export let tagFilter = "";

export function setRecipes(next) {
  recipes = next;
}

export function setSelection(next) {
  selection = next;
}

export function setChecked(next) {
  checked = next;
}

export function setCurrentView(next) {
  currentView = next;
}

export function setCurrentRecipeId(next) {
  currentRecipeId = next;
}

export function setSearchTerm(next) {
  searchTerm = next;
}

export function setTagFilter(next) {
  tagFilter = next;
}
