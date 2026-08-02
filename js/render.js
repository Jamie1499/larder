import { selection, currentView } from "./state.js";
import { shoppingCountBadge } from "./dom.js";
import { renderRecipeList } from "./recipeListView.js";
import { renderRecipeDetail } from "./recipeDetailView.js";
import { renderShoppingList } from "./shoppingListView.js";

export function updateTabs() {
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.view === currentView);
  });
  shoppingCountBadge.textContent = selection.size;
  shoppingCountBadge.classList.toggle("hidden", selection.size === 0);
}

export function render() {
  updateTabs();
  if (currentView === "recipes") renderRecipeList();
  else if (currentView === "detail") renderRecipeDetail();
  else if (currentView === "shopping") renderShoppingList();
}
