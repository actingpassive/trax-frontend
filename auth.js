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
      const welcomeName = document.getElementById('welcome-name');
      if(welcomeName) welcomeName.textContent = `${safeName || 'trader'}.`;
      if(loginBtn) loginBtn.style.display = 'none';
      if(logoutBtn) logoutBtn.style.display = 'inline-flex';
    } else {
      if(status) status.textContent = 'Not signed in';
      const welcomeName = document.getElementById('welcome-name');
      if(welcomeName) welcomeName.textContent = 'trader.';
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
    loadDashboard(Boolean(j.user && allowed));
  }catch(e){
    console.error('Auth check failed:', e);
    loadDashboard(false);
  }
}
function setDashboardValue(id, value){
  const element = document.getElementById(id);
  if(element) element.textContent = value;
}
setDashboardValue('latest-homework-title', 'No homework posted yet');
async function loadDashboard(allowed){
  const base = (typeof API_BASE !== 'undefined' ? API_BASE : '');
  try {
    const [homeworkResponse, dashboardResponse] = await Promise.all([
      fetch(`${base}/api/homework`, {credentials:'include', cache:'no-store'}),
      allowed ? fetch(`${base}/api/dashboard`, {credentials:'include', cache:'no-store'}) : Promise.resolve(null)
    ]);
    if(homeworkResponse.ok){
      const homework = await homeworkResponse.json();
      setDashboardValue('latest-homework-title', homework.title || 'No homework posted yet');
    }
    if(!dashboardResponse || !dashboardResponse.ok) return;
    const dashboard = await dashboardResponse.json();
    const videos = dashboard.videos || {};
    const homework = dashboard.homework || {};
    const login = dashboard.login || {};
    setDashboardValue('videos-completed', videos.completed ?? 0);
    setDashboardValue('videos-total', videos.total ?? 0);
    setDashboardValue('homework-completed', homework.completed ?? 0);
    setDashboardValue('homework-total', homework.total ?? 0);
    setDashboardValue('login-streak', login.streak ?? 0);
    const total = Number(videos.total || 0) + Number(homework.total || 0);
    const completed = Number(videos.completed || 0) + Number(homework.completed || 0);
    const percent = total ? Math.round((completed / total) * 100) : 0;
    setDashboardValue('overall-progress', `${percent}% complete`);
    const progressBar = document.getElementById('overall-progress-bar');
    if(progressBar) progressBar.style.width = `${percent}%`;
    setDashboardValue('progress-status', percent >= 75 ? 'ON TRACK' : 'IN PROGRESS');
  } catch(error) {
    console.error('Dashboard check failed:', error);
  }
}
function updateLocalDetails(){
  const now = new Date();
  const time = now.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
  const date = now.toLocaleDateString([], {month:'short', day:'numeric', year:'numeric'});
  document.querySelectorAll('[data-local-time]').forEach(el => el.textContent = time);
  document.querySelectorAll('[data-local-date]').forEach(el => el.textContent = date);
}
updateLocalDetails();
setInterval(updateLocalDetails, 60000);
refreshAuth();
