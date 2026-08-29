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
      if(j.user.avatar){
        const img = document.createElement('img');
        img.src = j.user.avatar;
        img.alt = j.user.username;
        img.className = 'user-avatar';
        status.textContent = '';
        status.appendChild(img);
        if (!allowed) status.append(' No permission');
      } else {
        status.textContent = allowed ? j.user.username + (j.isOwner ? ' (owner)' : '') : 'No permission';
      }
      loginBtn.style.display = 'none';
      logoutBtn.style.display = 'inline-flex';
    } else {
      status.textContent = 'Not signed in';
      loginBtn.style.display = 'inline-flex';
      logoutBtn.style.display = 'none';
    }
    const allowed = j.isOwner || j.isWhitelisted;
    document.querySelectorAll('[data-auth-only]').forEach(el=>{
      el.style.display = allowed ? 'inline-block' : 'none';
    });
  }catch(e){
    console.error('Auth check failed:', e);
  }
}
refreshAuth();
