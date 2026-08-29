// frontend/config.js — single source for backend URL
// When frontend and backend run on different origins (e.g. frontend :8080, backend :3000),
// this resolves to the backend. When served from the backend itself (port 3000), it is same-origin.
const API_BASE = (() => {
  // Allow override via global injected by hosting (e.g. window.__API_BASE__ set before config.js)
  if (typeof window !== 'undefined' && window.__API_BASE__) return window.__API_BASE__.replace(/\/$/, '');
  // Allow override via <meta name="api-base" content="https://api.example.com">
  const meta = typeof document !== 'undefined' ? document.querySelector('meta[name="api-base"]') : null;
  if (meta && meta.content) return meta.content.replace(/\/$/, '');
  // Local dev heuristic: only when frontend is on localhost/127.0.0.1 and not already on backend:3000
  if (typeof location !== 'undefined' && (location.hostname === 'localhost' || location.hostname === '127.0.0.1') && location.port !== '3000' && location.port !== '') {
    return 'http://localhost:3000';
  }
  return '';
})();
// expose for legacy scripts
if (typeof window !== 'undefined') window.API_BASE = API_BASE;

// Patch auth links to point at backend when separated (href="/auth/discord" -> API_BASE + "/auth/discord")
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    if (!API_BASE) return;
    document.querySelectorAll('a[href^="/auth/"]').forEach(a => {
      const href = a.getAttribute('href');
      if (href && href.startsWith('/auth/')) a.href = API_BASE + href;
    });
  });
}
