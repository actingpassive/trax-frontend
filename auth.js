function isSafeAvatarUrl(url){
  try{
    const u = new URL(String(url), location.origin);
    return u.protocol === 'https:' && (u.hostname === 'cdn.discordapp.com' || u.hostname === 'media.discordapp.net' || u.hostname === 'cdn.discordapp.net');
  }catch(e){ return false; }
}
async function refreshAuth(){
  try{
    const base = (typeof API_BASE !== 'undefined' ? API_BASE : (typeof window !== 'undefined' && window.API_BASE ? window.API_BASE : ''));
    const r = await fetch(`${base}/api/whoami?t=` + Date.now(), {credentials: 'include', cache: 'no-store'});
    const j = await r.json();
    const status = document.getElementById('user-status');
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    if(j.user){
      const allowed = j.isOwner || j.isWhitelisted;
      const safeName = String(j.user.username || '').slice(0,32);
      if(j.user.avatar && isSafeAvatarUrl(j.user.avatar)){
        const img = document.createElement('img');
        img.src = j.user.avatar;
        img.alt = safeName;
        img.className = 'user-avatar';
        img.referrerPolicy = 'no-referrer';
        // Harden: prevent onerror XSS if image fails
        img.onerror = function(){ this.remove(); status.textContent = allowed ? safeName + (j.isOwner ? ' (owner)' : '') : 'No permission'; };
        status.textContent = '';
        status.appendChild(img);
        if (!allowed) status.append(' No permission');
      } else {
        status.textContent = allowed ? safeName + (j.isOwner ? ' (owner)' : '') : 'No permission';
      }
      if(loginBtn) loginBtn.style.display = 'none';
      if(logoutBtn) logoutBtn.style.display = 'inline-flex';
    } else {
      if(status) status.textContent = 'Not signed in';
      if(loginBtn) loginBtn.style.display = 'inline-flex';
      if(logoutBtn) logoutBtn.style.display = 'none';
    }
    const allowed = j.isOwner || j.isWhitelisted;
    document.querySelectorAll('[data-auth-only]').forEach(el=>{
      // Auth gate: CSS alone not sufficient — also set aria-hidden and disable interactions when not allowed
      el.style.display = allowed ? 'inline-flex' : 'none';
      el.setAttribute('aria-hidden', allowed ? 'false' : 'true');
      if(!allowed) el.setAttribute('inert','');
      else el.removeAttribute('inert');
    });
  }catch(e){
    console.error('Auth check failed:', e);
  }
}
refreshAuth();
