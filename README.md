# trax-frontend

Vanilla HTML/CSS/JS — no build, no bundler. Backend is `../backend` (Express on `http://localhost:3000`).

## Quick start

```bash
# 1. point frontend at backend (default is http://localhost:3000 when frontend port != 3000)
#    override via meta tag in index.html or window.__API_BASE__ before config.js
npm install
npm run dev    # serve . on http://localhost:8080 (uses `serve` package, CORS enabled)
# open http://localhost:8080
```

## Config

`config.js` resolves `API_BASE`:
- `window.__API_BASE__` (set before loading config.js) — highest priority
- `<meta name="api-base" content="https://your-backend.com">`
- heuristic: if `location.port !== '3000'` → `http://localhost:3000`, else same-origin (`''`)

To deploy on Vercel/Netlify, set the meta tag or inject `window.__API_BASE__`.

## Backend URL

Set `FRONTEND_URL` in `backend/env/.env` to allow CORS, e.g. `FRONTEND_URL=http://localhost:8080`.

## Structure

- `index.html`, `homework.html`, `videos.html`, `nda.html`, `trades.html` + `*.js`, `style.css` — original `public/` content
- `config.js` — shared `API_BASE` (load before other scripts)

## Deploy notes

- No build step — deploy the folder as static files.
- Backend must allow this origin via CORS (`FRONTEND_URL` or localhost regex in `backend/server/server.js`).
