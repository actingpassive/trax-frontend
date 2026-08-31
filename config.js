// frontend/config.js — single source for backend URL
// When frontend and backend run on different origins (e.g. frontend :8080, backend :3000),
// this resolves to the backend. When served from the backend itself (port 3000), it is same-origin.
const API_BASE = (() => {
  if (typeof window !== 'undefined' && window.__API_BASE__) return window.__API_BASE__.replace(/\/$/, '');
  // Local dev heuristic MUST come before meta so localhost:8080 uses local backend, not production
  if (typeof location !== 'undefined' && (location.hostname === 'localhost' || location.hostname === '127.0.0.1') && location.port !== '3000' && location.port !== '') {
    return 'http://localhost:3000';
  }
  const meta = typeof document !== 'undefined' ? document.querySelector('meta[name="api-base"]') : null;
  if (meta && meta.content) return meta.content.replace(/\/$/, '');
  return '';
})();
if (typeof window !== 'undefined') window.API_BASE = API_BASE;
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    if (!API_BASE) return;
    document.querySelectorAll('a[href^="/auth/"]').forEach(a => {
      const href = a.getAttribute('href');
      if (href && href.startsWith('/auth/')) a.href = API_BASE + href;
    });
  });
}