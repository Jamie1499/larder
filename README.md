# Larder

A small, local-first recipe box and shopping list app that runs entirely in the browser — no backend, no build step.

## Features

- Add, edit, and search recipes with structured ingredients (quantity, unit, name) so amounts combine cleanly.
- Filter recipes by tag.
- Select recipes to build a categorized shopping list (Fruit & Veg, Meat & Fish, Dairy & Eggs, Bakery, Store Cupboard, Frozen, Other), with items combined and quantities summed across recipes.
- Check off shopping list items as you shop, and copy the outstanding list to paste into a supermarket's "quick add" search.
- Voice dictation for recipe titles, ingredients, and steps (uses the browser's Speech Recognition API, where supported).
- Scan a photo of a recipe card or cookbook page and send the recognized text to Ingredients or Steps (on-device OCR via Tesseract.js).
- All data is stored locally in the browser (`localStorage`) — nothing is sent to a server.

## Running locally

This is a static site with no dependencies to install. Serve the folder with any static file server, for example:

```bash
python -m http.server 8934
```

Then open `http://localhost:8934` in your browser.

## Files

- `index.html` — page structure and the recipe edit/add modal
- `app.js` — entry point: loads/migrates data on startup and wires up the tab buttons
- `js/` — app logic, split into modules:
  - `state.js` — shared mutable app state (recipes, selection, current view, etc.)
  - `storage.js` — `localStorage` load/save helpers
  - `ingredients.js` — quantity/unit parsing and formatting, legacy ingredient migration
  - `shopping.js` — shopping list aggregation and category rules
  - `seed.js` — first-run seed recipes
  - `render.js` — view dispatcher and tab state
  - `recipeListView.js`, `recipeDetailView.js`, `shoppingListView.js` — the three main views
  - `modal.js` — the add/edit recipe modal
  - `voice.js` — Speech Recognition dictation helpers
  - `ocr.js` — photo scanning via Tesseract.js
  - `dom.js`, `utils.js` — shared DOM references and HTML-escaping helpers
- `styles.css` — styling, including light/dark theme support
