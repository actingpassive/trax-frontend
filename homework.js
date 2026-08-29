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
  // Client-side size gate: 10MB per file, 30MB total
  const MAX_PER = 10 * 1024 * 1024;
  const MAX_TOTAL = 30 * 1024 * 1024;
  let total = 0;
  for (const f of input.files) total += f.size;
  if (Array.from(input.files).some(f => f.size > MAX_PER)) {
    status.textContent = 'Each file must be ≤10 MB.';
    input.value = '';
    return;
  }
  if (total > MAX_TOTAL) {
    status.textContent = 'Total upload must be ≤30 MB.';
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
      const reviewAvatar = owner.avatar ? `<img class="grade-avatar" src="${owner.avatar}" alt="${escapeHtml(owner.username)}" />` : '<span class="grade-avatar grade-avatar-fallback">R</span>';
      card.innerHTML = `
        <div class="grade-body">
          ${reviewAvatar}
        </div>
      `;
      return;
    }

    const g = await r.json();
    if (!g || !g.grade) return;

    const reviewAvatar = g.ownerAvatar ? `<img class="grade-avatar" src="${g.ownerAvatar}" alt="${escapeHtml(g.gradedBy || 'Owner')}" />` : (owner.avatar ? `<img class="grade-avatar" src="${owner.avatar}" alt="${escapeHtml(owner.username)}" />` : '<span class="grade-avatar grade-avatar-fallback">R</span>');
    // Build submission images safely with DOM APIs (prevent innerHTML src injection)
    const safeSubmission = document.createElement('div');
    safeSubmission.className = 'submission-images';
    (g.submissionImages || []).slice(0, 3).forEach(src => {
      try {
        const url = String(src);
        if (!/^https:\/\/cdn\.discordapp\.com\//.test(url) && !/^https:\/\/media\.discordapp\.net\//.test(url)) return;
        new URL(url);
        const img = document.createElement('img');
        img.className = 'submission-image';
        img.src = url;
        img.alt = 'Submitted homework';
        img.loading = 'lazy';
        safeSubmission.appendChild(img);
      } catch(e) {}
    });
    const feedbackHtml = `<p class="grade-feedback">${escapeHtml(g.feedback || '')}</p>`;
    card.innerHTML = `<div class="grade-body">${reviewAvatar}</div>`;
    const body = card.querySelector('.grade-body');
    if (safeSubmission.children.length) body.appendChild(safeSubmission);
    body.insertAdjacentHTML('beforeend', feedbackHtml);
  } catch (e) {
    card.innerHTML = '<p class="lede">Unable to load review — please refresh.</p>';
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
  document.getElementById('grade-card').innerHTML = `
    <div class="grade-tier">A<small>92 / 100</small></div>
    <div class="grade-body">
      <div class="grade-row">
        <span><strong>Graded</strong> ${new Date().toLocaleString()}</span>
        <span><strong>By</strong> trax mentor</span>
      </div>
      <p class="grade-feedback">Strong thesis. Invalidation was a touch tight against the prior swing — consider giving the level one ATR of breathing room. Notes on the second entry are in Discord.</p>
    </div>
  `;
}

check();
loadGrade();
