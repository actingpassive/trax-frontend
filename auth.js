function isSafeAvatarUrl(url){
  try{
    const u = new URL(String(url), location.origin);
    return u.protocol === 'https:' && (u.hostname === 'cdn.discordapp.com' || u.hostname === 'media.discordapp.net' || u.hostname === 'cdn.discordapp.net');
  }catch(e){ return false; }
}
function setDashboardValue(id, value){
  const el = document.getElementById(id);
  if(el && value !== undefined && value !== null && value !== '') el.textContent = String(value);
}
function updateDashboardDate(){
  const date = new Intl.DateTimeFormat(undefined, {year:'numeric', month:'short', day:'numeric'}).format(new Date());
  document.querySelectorAll('[data-local-date]').forEach(el=>{ el.textContent = date; });
}
async function refreshDashboard(j, base){
  updateDashboardDate();
  const stats = j.dashboard || j.stats || j.progress || {};
  const videosDone = stats.videosCompleted ?? stats.videosDone ?? j.videosCompleted ?? j.videosDone;
  const homeworkDone = stats.homeworkCompleted ?? stats.homeworkDone ?? j.homeworkCompleted ?? j.homeworkDone;
  const streak = stats.loginStreak ?? stats.streak ?? j.loginStreak ?? j.streak;
  setDashboardValue('videos-completed', videosDone);
  setDashboardValue('homework-completed', homeworkDone);
  setDashboardValue('login-streak', streak);
  setDashboardValue('overall-progress', stats.percentComplete != null ? `${stats.percentComplete}% complete` : null);
  const progressBar = document.getElementById('overall-progress-bar');
  if(progressBar && stats.percentComplete != null) progressBar.style.width = `${Math.max(0, Math.min(100, Number(stats.percentComplete)))}%`;
  try{
    const response = await fetch(`${base}/api/videos`, {credentials:'include', cache:'no-store'});
    if(response.ok){
      const data = await response.json();
      const videos = Array.isArray(data) ? data : (Array.isArray(data.videos) ? data.videos : []);
      setDashboardValue('videos-total', videos.length);
    }
  }catch(e){}
}
async function refreshAuth(){
  document.querySelectorAll('[data-auth-only]').forEach(el=>{
    el.style.display = 'none';
    el.setAttribute('aria-hidden', 'true');
    el.setAttribute('inert', '');
  });
  try{
    const base = (typeof API_BASE !== 'undefined' ? API_BASE : (typeof window !== 'undefined' && window.API_BASE ? window.API_BASE : ''));
    const r = await fetch(`${base}/api/whoami?t=` + Date.now(), {credentials: 'include', cache: 'no-store'});
    const j = await r.json();
    const status = document.getElementById('user-status');
    const welcomeName = document.getElementById('welcome-name');
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    if(j.user){
      const allowed = j.isOwner || j.isWhitelisted;
      const safeName = String(j.user.displayName || j.user.username || j.user.global_name || j.user.discordName || j.user.name || '').trim().slice(0,32);
      if(welcomeName) welcomeName.textContent = safeName || 'trader.';
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
      if(welcomeName) welcomeName.textContent = 'trader.';
      if(loginBtn) loginBtn.style.display = 'inline-flex';
      if(logoutBtn) logoutBtn.style.display = 'none';
    }
    const allowed = j.isOwner || j.isWhitelisted;
    document.querySelectorAll('[data-auth-only]').forEach(el=>{
      // Auth gate: CSS alone not sufficient — also set aria-hidden and disable interactions when not allowed
      el.style.display = allowed ? '' : 'none';
      el.setAttribute('aria-hidden', allowed ? 'false' : 'true');
      if(!allowed) el.setAttribute('inert','');
      else el.removeAttribute('inert');
    });
    if(allowed) refreshDashboard(j, base);
  }catch(e){
    console.error('Auth check failed:', e);
    updateDashboardDate();
  }
}
updateDashboardDate();
refreshAuth();
