import { recipes, selection, checked } from "./state.js";
import { saveSelection, saveChecked } from "./storage.js";
import { CATEGORY_ORDER, buildShoppingList } from "./shopping.js";
import { escapeHtml, escapeAttr } from "./utils.js";
import { app } from "./dom.js";
import { render } from "./render.js";

// ---------- Shopping list view ----------
export function renderShoppingList() {
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
