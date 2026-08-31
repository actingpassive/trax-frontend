const API = (typeof API_BASE !== 'undefined' ? API_BASE : (typeof window !== 'undefined' && window.API_BASE ? window.API_BASE : ''));
const title = document.getElementById('homework-title');
const status = document.getElementById('upload-status');

async function check() {
  try {
    const [briefResponse, authResponse] = await Promise.all([
      fetch(`${API}/api/homework`, { credentials: 'include' }),
      fetch(`${API}/api/whoami`, { credentials: 'include', cache: 'no-store' })
    ]);

    const brief = await briefResponse.json();
    const auth = await authResponse.json();

    title.textContent = brief.title;
    document.getElementById('homework-description').textContent = brief.description;
    const imgContainer = document.getElementById('homework-images');
    imgContainer.replaceChildren();
    const ALLOWED_CDN = ['https://cdn.discordapp.com/', 'https://media.discordapp.net/', 'https://cdn.discordapp.net/'];
    (brief.images || []).forEach(src => {
      try {
        const url = String(src);
        if (!ALLOWED_CDN.some(prefix => url.startsWith(prefix))) return;
        // Validate URL parses
        new URL(url);
        const img = document.createElement('img');
        img.src = url;
        img.alt = 'Homework reference';
        img.loading = 'lazy';
        img.referrerPolicy = 'no-referrer';
        imgContainer.appendChild(img);
      } catch(e) {}
    });

    const allowed = auth.isOwner || auth.isWhitelisted;
    const hasUser = Boolean(auth.user);

    document.querySelector('[data-auth-only]').style.display = allowed ? 'inline-flex' : 'none';
    document.getElementById('homework-login').style.display = hasUser ? 'none' : 'inline-flex';

    if (!hasUser) {
      status.textContent = 'Sign in with Discord to submit work.';
    } else if (!allowed) {
      status.textContent = 'Your Discord account is not whitelisted yet.';
    } else {
      status.textContent = '';
    }
  } catch (e) {
    status.textContent = 'Unable to load the homework desk.';
  }
}

document.getElementById('homework-files').addEventListener('change', async e => {
  const input = e.target;
  if (!input.files.length) return;
  // Client-side validation: images only, 50 MB gate (task: 50MB homework images)
  const MAX_PER = 50 * 1024 * 1024;
  const MAX_TOTAL = 50 * 1024 * 1024;
  const ALLOWED_EXT = /\.(png|jpe?g|webp|gif)$/i;
  const ALLOWED_MIME = new Set(['image/png','image/jpeg','image/jpg','image/webp','image/gif']);
  for (const f of input.files) {
    if (!ALLOWED_EXT.test(f.name) || (f.type && !ALLOWED_MIME.has(f.type.toLowerCase()))) {
      status.textContent = 'Invalid file type — images only: PNG, JPG, WEBP, GIF (50 MB max).';
      input.value = '';
      return;
    }
    if (f.size > MAX_PER) {
      status.textContent = 'Each image must be \u226450 MB.';
      input.value = '';
      return;
    }
  }
  let total = 0;
  for (const f of input.files) total += f.size;
  if (total > MAX_TOTAL) {
    status.textContent = 'Total upload must be \u226450 MB.';
    input.value = '';
    return;
  }
  if (input.files.length > 5) {
    status.textContent = 'Max 5 files per submission.';
    input.value = '';
    return;
  }
  input.disabled = true;
  const form = new FormData();
  Array.from(input.files).forEach(file => form.append('files', file, file.name));
  form.append('title', title.textContent);

  status.textContent = 'Sending to private review...';
  try {
    const response = await fetch(`${API}/api/upload`, { method: 'POST', body: form, credentials: 'include' });
    status.textContent = response.ok ? 'Submitted to private review.' : 'Submission failed. Please try again.';
    if (response.ok) input.value = '';
  } finally {
    input.disabled = false;
  }
});

async function loadGrade() {
  const card = document.getElementById('grade-card');
  if (!card) return;

  try {
    const ownerInfo = await fetch(`${API}/api/whoami`, { credentials: 'include', cache: 'no-store' }).then(res => res.json()).catch(() => ({ owner: null }));
    const owner = ownerInfo.owner || { username: 'Owner', avatar: null };

    const r = await fetch(`${API}/api/homework/grade`, { credentials: 'include' });
    if (r.status === 404 || !r.ok) {
      card.replaceChildren();
      const bodyOk = document.createElement('div');
      bodyOk.className = 'grade-body';
      if (owner.avatar && isSafeImageUrl(owner.avatar)) {
        const img = document.createElement('img');
        img.className = 'grade-avatar';
        img.src = owner.avatar;
        img.alt = String(owner.username || 'Owner');
        bodyOk.appendChild(img);
      } else {
        const fallback = document.createElement('span');
        fallback.className = 'grade-avatar grade-avatar-fallback';
        fallback.textContent = 'R';
        bodyOk.appendChild(fallback);
      }
      card.appendChild(bodyOk);
      return;
    }

    const g = await r.json();
    if (!g || !g.grade) return;

    const safeSubmission = document.createElement('div');
    safeSubmission.className = 'submission-images';
    (g.submissionImages || []).slice(0, 3).forEach(src => {
      try {
        const url = String(src);
        if (!isSafeImageUrl(url)) return;
        new URL(url);
        const img = document.createElement('img');
        img.className = 'submission-image';
        img.src = url;
        img.alt = 'Submitted homework';
        img.loading = 'lazy';
        safeSubmission.appendChild(img);
      } catch(e) {}
    });
    // Build grade card entirely via DOM APIs — no innerHTML with user data
    card.replaceChildren();
    const body = document.createElement('div');
    body.className = 'grade-body';
    const avatarUrl = g.ownerAvatar || owner.avatar;
    if (avatarUrl && isSafeImageUrl(avatarUrl)) {
      const img = document.createElement('img');
      img.className = 'grade-avatar';
      img.src = avatarUrl;
      img.alt = String(g.gradedBy || owner.username || 'Owner');
      body.appendChild(img);
    } else {
      const fallback2 = document.createElement('span');
      fallback2.className = 'grade-avatar grade-avatar-fallback';
      fallback2.textContent = 'R';
      body.appendChild(fallback2);
    }
    if (safeSubmission.children.length) body.appendChild(safeSubmission);
    const feedbackP = document.createElement('p');
    feedbackP.className = 'grade-feedback';
    feedbackP.textContent = g.feedback || '';
    body.appendChild(feedbackP);
    card.appendChild(body);
  } catch (e) {
    card.replaceChildren();
    const p = document.createElement('p');
    p.className = 'lede';
    p.textContent = 'Unable to load review — please refresh.';
    card.appendChild(p);
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));
}
function isSafeImageUrl(url) {
  try {
    const u = new URL(String(url));
    return (u.protocol === 'https:' && (u.hostname === 'cdn.discordapp.com' || u.hostname === 'media.discordapp.net' || u.hostname === 'cdn.discordapp.net'));
  } catch(e) { return false; }
}

function formatDate(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString();
  } catch (_) {
    return iso;
  }
}

if (location.search.includes('demoGrade=1')) {
  const demoCard = document.getElementById('grade-card');
  demoCard.replaceChildren();
  const tier = document.createElement('div');
  tier.className = 'grade-tier';
  tier.textContent = 'A';
  const scoreSmall = document.createElement('small');
  scoreSmall.textContent = '92 / 100';
  tier.appendChild(scoreSmall);
  const dBody = document.createElement('div');
  dBody.className = 'grade-body';
  const row = document.createElement('div');
  row.className = 'grade-row';
  const s1 = document.createElement('span');
  const strong1 = document.createElement('strong');
  strong1.textContent = 'Graded';
  s1.appendChild(strong1);
  s1.appendChild(document.createTextNode(' ' + new Date().toLocaleString()));
  const s2 = document.createElement('span');
  const strong2 = document.createElement('strong');
  strong2.textContent = 'By';
  s2.appendChild(strong2);
  s2.appendChild(document.createTextNode(' trax mentor'));
  row.appendChild(s1); row.appendChild(s2);
  const fp = document.createElement('p');
  fp.className = 'grade-feedback';
  fp.textContent = 'Strong thesis. Invalidation was a touch tight against the prior swing — consider giving the level one ATR of breathing room. Notes on the second entry are in Discord.';
  dBody.appendChild(row); dBody.appendChild(fp);
  demoCard.appendChild(tier); demoCard.appendChild(dBody);
}

check();
loadGrade();
