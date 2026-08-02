import { supabase } from "./supabaseClient.js";
import { parseLegacyIngredientLine } from "./ingredients.js";
import { appendLine, setValueAndNotify } from "./voice.js";
import { addIngredientRow, removeEmptyIngredientRows } from "./modal.js";

// ---------- Recipe import from a URL ----------
// Delegates the actual fetch to a Supabase Edge Function (server-side, so it
// isn't blocked by CORS) which extracts the page's schema.org Recipe JSON-LD.
async function fetchRecipe(url) {
  const { data, error } = await supabase.functions.invoke("import-recipe", { body: { url } });
  if (error) throw new Error("Couldn't reach the import service. Try again.");
  if (data?.error) throw new Error(data.error);
  return data;
}

export function setupUrlImport() {
  const toggleBtn = document.getElementById("url-import-btn");
  const row = document.getElementById("url-import-row");
  const input = document.getElementById("import-url-input");
  const goBtn = document.getElementById("url-import-go-btn");
  const status = document.getElementById("ocr-status");
  const results = document.getElementById("ocr-results");

  toggleBtn.addEventListener("click", () => {
    row.classList.toggle("hidden");
    if (!row.classList.contains("hidden")) input.focus();
  });

  async function runImport() {
    const url = input.value.trim();
    if (!url) return;

    status.classList.remove("hidden");
    status.textContent = "Fetching that page…";
    results.classList.add("hidden");
    results.innerHTML = "";

    goBtn.disabled = true;
    try {
      const recipe = await fetchRecipe(url);
      const titleField = document.getElementById("f-title");
      if (recipe.title && !titleField.value.trim()) setValueAndNotify(titleField, recipe.title);

      const ingredients = recipe.ingredients || [];
      if (ingredients.length) removeEmptyIngredientRows();
      ingredients.forEach((line) => addIngredientRow(parseLegacyIngredientLine(line)));

      const steps = recipe.steps || [];
      const stepsField = document.getElementById("f-steps");
      steps.forEach((line) => appendLine(stepsField, line));

      if (!ingredients.length && !steps.length) {
        status.textContent = "Couldn't find a recipe on that page. Try scanning a photo instead.";
      } else {
        status.textContent = `Added ${ingredients.length} ingredient${ingredients.length === 1 ? "" : "s"} and ${steps.length} step${steps.length === 1 ? "" : "s"} from that link — check the fields above.`;
      }
    } catch (err) {
      status.textContent = err.message || "Something went wrong importing that link.";
    } finally {
      goBtn.disabled = false;
    }
  }

  goBtn.addEventListener("click", runImport);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      runImport();
    }
  });
}
