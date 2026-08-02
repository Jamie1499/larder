import { recipes, currentView, currentRecipeId, setCurrentRecipeId } from "./state.js";
import { saveRecipes } from "./storage.js";
import { parseQtyInput, normalizeUnit, formatQty, parseLegacyIngredientLine } from "./ingredients.js";
import { setupSingleShotMic, setupContinuousMic, stopActiveRecognition, appendLine, setValueAndNotify } from "./voice.js";
import { handlePhotoScan, resetImportTools } from "./ocr.js";
import { setupUrlImport } from "./urlImport.js";
import { uploadRecipeImage } from "./images.js";
import { currentUserEmail } from "./currentUser.js";
import { render } from "./render.js";

// ---------- Modal (add/edit) ----------
const ingredientRowsEl = () => document.getElementById("ingredient-rows");
const ingredientTemplate = () => document.getElementById("ingredient-row-template");

export function addIngredientRow(data) {
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

// Clears out any still-blank ingredient rows (e.g. the default empty row a
// new recipe starts with) before a photo/URL import adds real ones, so the
// import doesn't leave a stray empty row mixed in with the results.
export function removeEmptyIngredientRows() {
  ingredientRowsEl()
    .querySelectorAll(".ingredient-row")
    .forEach((row) => {
      const isBlank =
        !row.querySelector(".ing-qty").value.trim() &&
        !row.querySelector(".ing-unit").value &&
        !row.querySelector(".ing-name").value.trim();
      if (isBlank) row.remove();
    });
}

// Updates the image preview + the hidden field the submit handler reads —
// shared by the manual upload button and the photo-scan/URL-import auto-fill.
export function setRecipeImage(url) {
  const preview = document.getElementById("recipe-image-preview");
  document.getElementById("recipe-image-url").value = url || "";
  if (url) {
    preview.src = url;
    preview.classList.remove("hidden");
  } else {
    preview.src = "";
    preview.classList.add("hidden");
  }
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

export function setupModal() {
  const modal = document.getElementById("recipe-modal");
  const form = document.getElementById("recipe-form");

  document.getElementById("cancel-btn").addEventListener("click", () => {
    stopActiveRecognition();
    modal.close();
  });
  modal.addEventListener("close", stopActiveRecognition);

  document.getElementById("add-ingredient-btn").addEventListener("click", () => addIngredientRow());

  setupSingleShotMic(document.getElementById("title-mic-btn"), (text) => {
    setValueAndNotify(document.getElementById("f-title"), text);
  });
  setupSingleShotMic(document.getElementById("voice-ingredient-btn"), (text) => {
    addIngredientRow(parseLegacyIngredientLine(text));
  });
  setupContinuousMic(document.getElementById("steps-mic-btn"), (text) => {
    appendLine(document.getElementById("f-steps"), text);
  });

  document.getElementById("add-image-btn").addEventListener("click", () => {
    document.getElementById("recipe-image-input").click();
  });
  document.getElementById("recipe-image-input").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;

    const status = document.getElementById("image-status");
    setRecipeImage(URL.createObjectURL(file));
    status.textContent = "Uploading photo…";
    status.classList.remove("hidden");
    try {
      const url = await uploadRecipeImage(document.getElementById("recipe-id").value, file);
      setRecipeImage(url);
      status.classList.add("hidden");
    } catch (err) {
      status.textContent = err.message || "Couldn't upload that photo.";
    }
  });

  document.getElementById("scan-photo-btn").addEventListener("click", () => {
    document.getElementById("photo-input").click();
  });
  document.getElementById("photo-input").addEventListener("change", (e) => {
    const files = [...e.target.files];
    if (files.length) handlePhotoScan(files);
    e.target.value = "";
  });

  setupUrlImport();

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
    const imageUrl = document.getElementById("recipe-image-url").value || null;

    if (!title || ingredients.length === 0 || steps.length === 0) {
      e.preventDefault();
      alert("Please fill in a title, at least one ingredient (with a name), and at least one step.");
      return;
    }

    const idx = recipes.findIndex((r) => r.id === id);
    if (idx !== -1) {
      recipes[idx] = { ...recipes[idx], title, servings, tags, ingredients, steps, notes, imageUrl };
    } else {
      recipes.push({
        id,
        title,
        servings,
        tags,
        ingredients,
        steps,
        notes,
        imageUrl,
        createdBy: currentUserEmail,
        createdAt: Date.now(),
      });
    }
    saveRecipes(recipes);

    setTimeout(() => {
      if (currentView === "detail") {
        setCurrentRecipeId(id || recipes[recipes.length - 1].id);
      }
      render();
    }, 0);
  });
}

export function openModal(recipe) {
  const modal = document.getElementById("recipe-modal");
  document.getElementById("modal-title").textContent = recipe ? "Edit Recipe" : "New Recipe";
  document.getElementById("recipe-id").value = recipe ? recipe.id : crypto.randomUUID();
  document.getElementById("f-title").value = recipe ? recipe.title : "";
  document.getElementById("f-servings").value = recipe ? recipe.servings : 4;
  document.getElementById("f-tags").value = recipe ? recipe.tags.join(", ") : "";
  document.getElementById("f-steps").value = recipe ? recipe.steps.join("\n") : "";
  document.getElementById("f-notes").value = recipe ? recipe.notes || "" : "";
  setRecipeImage(recipe ? recipe.imageUrl : null);
  document.getElementById("image-status").classList.add("hidden");
  renderIngredientRows(recipe ? recipe.ingredients : null);
  resetImportTools();
  modal.showModal();
}
