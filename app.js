import { loadRecipes, saveRecipes, loadSelection, loadChecked } from "./js/storage.js";
import { migrateRecipes } from "./js/ingredients.js";
import { seedIfEmpty } from "./js/seed.js";
import { setRecipes, setSelection, setChecked, setCurrentView, setCurrentRecipeId } from "./js/state.js";
import { setupModal } from "./js/modal.js";
import { render } from "./js/render.js";
import { setupAuth } from "./js/auth.js";

let tabsReady = false;
let modalReady = false;

async function init() {
  await seedIfEmpty();
  const recipes = await loadRecipes();
  if (migrateRecipes(recipes)) saveRecipes(recipes);
  setRecipes(recipes);
  setSelection(await loadSelection());
  setChecked(await loadChecked());

  if (!tabsReady) {
    document.querySelectorAll(".tab-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        setCurrentView(btn.dataset.view);
        setCurrentRecipeId(null);
        render();
      });
    });
    tabsReady = true;
  }

  if (!modalReady) {
    setupModal();
    modalReady = true;
  }

  setCurrentView("recipes");
  setCurrentRecipeId(null);
  render();
}

setupAuth(init, () => {});
