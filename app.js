import { loadRecipes, saveRecipes, loadSelection, loadChecked } from "./js/storage.js";
import { migrateRecipes } from "./js/ingredients.js";
import { seedIfEmpty } from "./js/seed.js";
import { setRecipes, setSelection, setChecked, setCurrentView, setCurrentRecipeId } from "./js/state.js";
import { setupModal } from "./js/modal.js";
import { render } from "./js/render.js";

function init() {
  seedIfEmpty();
  const recipes = loadRecipes();
  if (migrateRecipes(recipes)) saveRecipes(recipes);
  setRecipes(recipes);
  setSelection(loadSelection());
  setChecked(loadChecked());

  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      setCurrentView(btn.dataset.view);
      setCurrentRecipeId(null);
      render();
    });
  });

  setupModal();
  render();
}

init();
