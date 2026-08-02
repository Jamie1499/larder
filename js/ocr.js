import { parseLegacyIngredientLine } from "./ingredients.js";
import { appendLine } from "./voice.js";
import { addIngredientRow } from "./modal.js";

// ---------- Photo scanning (on-device OCR) ----------
export function resetImportTools() {
  const status = document.getElementById("ocr-status");
  const results = document.getElementById("ocr-results");
  status.classList.add("hidden");
  status.textContent = "";
  results.classList.add("hidden");
  results.innerHTML = "";
  document.getElementById("photo-input").value = "";
}

function buildOcrLine(text) {
  const li = document.createElement("li");
  li.className = "ocr-line";

  const span = document.createElement("span");
  span.textContent = text;

  const ingBtn = document.createElement("button");
  ingBtn.type = "button";
  ingBtn.className = "btn small ghost";
  ingBtn.textContent = "+ Ingredient";
  ingBtn.addEventListener("click", () => {
    addIngredientRow(parseLegacyIngredientLine(text));
    li.classList.add("used");
  });

  const stepBtn = document.createElement("button");
  stepBtn.type = "button";
  stepBtn.className = "btn small ghost";
  stepBtn.textContent = "+ Step";
  stepBtn.addEventListener("click", () => {
    appendLine(document.getElementById("f-steps"), text);
    li.classList.add("used");
  });

  li.append(span, ingBtn, stepBtn);
  return li;
}

export async function handlePhotoScan(file) {
  const status = document.getElementById("ocr-status");
  const results = document.getElementById("ocr-results");

  status.classList.remove("hidden");
  status.textContent = "Reading photo… this can take a few seconds.";
  results.classList.add("hidden");
  results.innerHTML = "";

  if (typeof Tesseract === "undefined") {
    status.textContent = "Photo scanning couldn't load (needs an internet connection the first time). Try again once you're online.";
    return;
  }

  try {
    const { data } = await Tesseract.recognize(file, "eng");
    const lines = data.text
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    if (!lines.length) {
      status.textContent = "Couldn't find any readable text in that photo — try a clearer, well-lit shot.";
      return;
    }

    status.textContent = `Found ${lines.length} line${lines.length === 1 ? "" : "s"} — send the useful ones to Ingredients or Steps below.`;
    results.classList.remove("hidden");
    lines.forEach((line) => results.appendChild(buildOcrLine(line)));
  } catch {
    status.textContent = "Something went wrong reading that photo. Try a clearer, well-lit shot.";
  }
}
