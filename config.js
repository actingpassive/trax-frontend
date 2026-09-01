const API_BASE = (() => {
  const ALLOWED_ORIGINS = new Set([
    'https://drafted.world',
    'https://www.drafted.world',
    'https://api.drafted.world'
  ]);
  function isAllowedUrl(s){
    if(!s) return false;
    const t = String(s).trim();
    if(/^\s*javascript:/i.test(t) || /^\s*data:/i.test(t) || /^\s*vbscript:/i.test(t)) return false;
    try{
      const u = new URL(t, location.origin);
      if(u.protocol !== 'https:' && !(location.hostname === 'localhost' || location.hostname === '127.0.0.1')) return false;
      // allow empty (same-origin), localhost dev, or allowlisted drafts
      if(t === '' ) return true;
      if(u.hostname === 'localhost' || u.hostname === '127.0.0.1') return true;
      if(ALLOWED_ORIGINS.has(u.origin)) return true;
      return false;
    }catch(e){ return false; }
  }
  function normalizeBase(raw){
    if(!raw) return '';
    let s = String(raw).trim().replace(/\/$/, '');
    if(!isAllowedUrl(s)) return '';
    try{
      const u = new URL(s, location.origin);
      return u.origin;
    }catch(e){ return ''; }
  }
  // Local dev heuristic MUST come before meta so localhost:8080 uses local backend, not production
  if (typeof location !== 'undefined' && (location.hostname === 'localhost' || location.hostname === '127.0.0.1') && location.port !== '3000' && location.port !== '') {
    return 'http://localhost:3000';
  }
  if (typeof window !== 'undefined' && window.__API_BASE__) {
    const nb = normalizeBase(window.__API_BASE__);
    if(nb) return nb;
    // fall through to meta if window value blocked
  }
  const meta = typeof document !== 'undefined' ? document.querySelector('meta[name="api-base"]') : null;
  if (meta && meta.content) {
    const nb2 = normalizeBase(meta.content);
    if(nb2) return nb2;
  }
  return '';
})();
if (typeof window !== 'undefined') window.API_BASE = API_BASE;
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    if (!API_BASE) return;
    // Only rewrite relative auth hrefs — never allow userInput in API_BASE path
    document.querySelectorAll('a[href^="/auth/"]').forEach(a => {
      const href = a.getAttribute('href');
      if (href && href.startsWith('/auth/') && !/^\s*javascript:/i.test(href)) a.href = API_BASE + href;
    });
  });
}