import { parseLegacyIngredientLine, classifyLine } from "./ingredients.js";
import { appendLine } from "./voice.js";
import { addIngredientRow, removeEmptyIngredientRows, setRecipeImage } from "./modal.js";
import { uploadRecipeImage } from "./images.js";

// ---------- Photo scanning (on-device OCR) ----------
export function resetImportTools() {
  const status = document.getElementById("ocr-status");
  const results = document.getElementById("ocr-results");
  status.classList.add("hidden");
  status.textContent = "";
  results.classList.add("hidden");
  results.innerHTML = "";
  document.getElementById("photo-input").value = "";
  document.getElementById("url-import-row").classList.add("hidden");
  document.getElementById("import-url-input").value = "";
}

function buildOcrLine(text) {
  const li = document.createElement("li");
  li.className = "ocr-line";
  const span = document.createElement("span");
  span.textContent = text;
  li.append(span);
  return li;
}

export async function handlePhotoScan(files) {
  const status = document.getElementById("ocr-status");
  const results = document.getElementById("ocr-results");

  status.classList.remove("hidden");
  status.textContent =
    files.length > 1 ? `Reading ${files.length} photos… this can take a while.` : "Reading photo… this can take a few seconds.";
  results.classList.add("hidden");
  results.innerHTML = "";

  if (typeof Tesseract === "undefined") {
    status.textContent = "Photo scanning couldn't load (needs an internet connection the first time). Try again once you're online.";
    return;
  }

  try {
    const allLines = [];
    for (const file of files) {
      const { data } = await Tesseract.recognize(file, "eng");
      data.text
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .forEach((l) => allLines.push(l));
    }

    if (!allLines.length) {
      status.textContent = "Couldn't find any readable text in that photo — try a clearer, well-lit shot.";
      return;
    }

    const classified = allLines.map((line) => [line, classifyLine(line)]);
    if (classified.some(([, kind]) => kind === "ingredient")) removeEmptyIngredientRows();

    let ingredientCount = 0;
    let stepCount = 0;
    classified.forEach(([line, kind]) => {
      if (kind === "ingredient") {
        addIngredientRow(parseLegacyIngredientLine(line));
        ingredientCount++;
      } else {
        appendLine(document.getElementById("f-steps"), line);
        stepCount++;
      }
    });

    status.textContent =
      `Added ${ingredientCount} ingredient${ingredientCount === 1 ? "" : "s"} and ${stepCount} step${stepCount === 1 ? "" : "s"} automatically` +
      ` — check the fields above and fix anything that landed in the wrong place. Recognised text is below for reference.`;
    results.classList.remove("hidden");
    allLines.forEach((line) => results.appendChild(buildOcrLine(line)));

    if (!document.getElementById("recipe-image-url").value) {
      try {
        const url = await uploadRecipeImage(document.getElementById("recipe-id").value, files[0]);
        setRecipeImage(url);
      } catch {
        // Non-critical — the scan itself already succeeded, just skip the photo.
      }
    }
  } catch {
    status.textContent = "Something went wrong reading that photo. Try a clearer, well-lit shot.";
  }
}
