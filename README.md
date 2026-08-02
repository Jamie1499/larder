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
- `app.js` — app logic: storage, ingredient parsing, shopping list aggregation, rendering, and view state
- `styles.css` — styling, including light/dark theme support
