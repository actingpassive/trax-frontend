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
- `<meta name="api-base" content="https://your-backend.com">` in `index.html` — set this when backend is hosted
- heuristic: if `location.hostname === 'localhost'` and port `!== '3000'` → `http://localhost:3000`, else same-origin (`''`)

To deploy on Vercel/Netlify, set the meta tag or inject `window.__API_BASE__`.

## GitHub Pages (current)

- Live: `https://actingpassive.github.io/trax-frontend/` — deployed from `main` via `.github/workflows/pages.yml` (Actions, `.nojekyll` + `404.html` for pretty URLs).
- Links are `homework.html` etc (relative) so they work at `/trax-frontend/` subpath *and* at custom domain root.
- To point backend: edit `index.html` `<meta name="api-base" content="https://YOUR_BACKEND_URL">` (must be `https` in prod) and push to `main`.

## Custom domain (when you buy one)

1. In repo Settings → Pages → Custom domain → enter `yourdomain.com` → Save (creates `CNAME` file).
2. At your DNS provider add `CNAME` records for `www` + apex as GitHub instructs (usually `185.199.108.153` etc or `CNAME` to `actingpassive.github.io`).
3. Wait for DNS + check "Enforce HTTPS".
4. Update `<meta name="api-base">` if needed (still backend URL) and set `FRONTEND_URL=https://yourdomain.com` in `backend/env/.env` (CORS). Redeploy backend.
5. No code change for relative links — `homework.html` works at both subpath and root.

## Backend URL

Set `FRONTEND_URL` in `backend/env/.env` to allow CORS:

```
FRONTEND_URL=http://localhost:8080            # local dev
FRONTEND_URL=https://actingpassive.github.io  # Pages (or https://actingpassive.github.io/trax-frontend — origin only)
FRONTEND_URL=https://yourdomain.com            # custom domain
```

## Structure

- `index.html`, `homework.html`, `videos.html`, `nda.html`, `trades.html` + `*.js`, `style.css` — original `public/` content
- `config.js` — shared `API_BASE` (load before other scripts)

## Deploy notes

- No build step — deploy the folder as static files.
- Backend must allow this origin via CORS (`FRONTEND_URL` or localhost regex in `backend/server/server.js`).
