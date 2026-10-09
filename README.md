# DishDash — Food Delivery

Static food-delivery site (HTML/CSS/JS ES modules). Live: https://praveen-sahni.github.io/dishdash-food-delivery/

## Run locally

`python3 -m http.server` then open http://localhost:8000

## Tests

`npm test` — pure pricing/validation unit tests (`tests/`, `js/pricing.js`).

## Notes

- `js/data.js` + `js/pricing.js` are the source of truth; `js/app.js` is the UI.
- Images are local SVGs in `images/` (swap with real `.webp` photos anytime — same filenames work, or update `img` in `js/data.js`).
- PWA: `sw.js` caches the shell for offline menu/cart.
- Newsletter form has `data-endpoint=""` — set it to a backend URL to POST `{email}`; empty means local mock mode.
- Area pages live in `areas/` and are listed in `sitemap.xml`.
