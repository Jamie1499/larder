import { recipes, selection, currentRecipeId, setCurrentView, setRecipes } from "./state.js";
import { saveRecipes, saveSelection } from "./storage.js";
import { formatIngredient } from "./ingredients.js";
import { escapeHtml } from "./utils.js";
import { app } from "./dom.js";
import { openModal } from "./modal.js";
import { updateTabs, render } from "./render.js";

// ---------- Recipe detail view ----------
export function renderRecipeDetail() {
  const r = recipes.find((x) => x.id === currentRecipeId);
  if (!r) {
    setCurrentView("recipes");
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
    setCurrentView("recipes");
    render();
  });
  document.getElementById("edit-btn").addEventListener("click", () => openModal(r));
  document.getElementById("delete-btn").addEventListener("click", () => {
    if (confirm(`Delete "${r.title}"? This can't be undone.`)) {
      const remaining = recipes.filter((x) => x.id !== r.id);
      setRecipes(remaining);
      saveRecipes(remaining);
      selection.delete(r.id);
      saveSelection(selection);
      setCurrentView("recipes");
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
