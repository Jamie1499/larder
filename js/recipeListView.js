import { recipes, selection, searchTerm, tagFilter, setSearchTerm, setTagFilter, setCurrentRecipeId, setCurrentView } from "./state.js";
import { saveSelection } from "./storage.js";
import { escapeHtml, escapeAttr } from "./utils.js";
import { app } from "./dom.js";
import { openModal } from "./modal.js";
import { updateTabs, render } from "./render.js";

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
      setCurrentRecipeId(card.dataset.id);
      setCurrentView("detail");
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

export function renderRecipeList() {
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
    setSearchTerm(e.target.value);
    renderRecipeListOnly();
  });
  document.getElementById("tag-filter").addEventListener("change", (e) => {
    setTagFilter(e.target.value);
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
