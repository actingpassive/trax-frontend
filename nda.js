const file = document.getElementById('ndaFile');
const form = document.getElementById('nda-form');
const status = document.getElementById('nda-status');

file.addEventListener('change', () => {
  const f = file.files[0];
  document.getElementById('file-name').textContent = f?.name || 'Choose signed NDA';
  const statusEl = document.getElementById('nda-status');
  if (f && f.size > 15 * 1024 * 1024) {
    statusEl.textContent = 'File too large — max 15 MB.';
    file.value = '';
    document.getElementById('file-name').textContent = 'Choose signed NDA';
    return;
  }
  if (f && !/\.(pdf|doc|docx)$/i.test(f.name)) {
    statusEl.textContent = 'Invalid type — PDF, DOC, or DOCX only.';
    file.value = '';
    document.getElementById('file-name').textContent = 'Choose signed NDA';
    return;
  }
  if (f) statusEl.textContent = '';
});

form.addEventListener('submit', async event => {
  event.preventDefault();
  const f = file.files[0];
  if (f && f.size > 15 * 1024 * 1024) {
    status.textContent = 'File too large — max 15 MB.';
    return;
  }
  const btn = form.querySelector('button[type="submit"]');
  if (btn) btn.disabled = true;
  status.textContent = 'Submitting...';

  try {
    const base = (typeof API_BASE !== 'undefined' ? API_BASE : (typeof window !== 'undefined' && window.API_BASE ? window.API_BASE : ''));
    const response = await fetch(`${base}/api/nda`, {
      method: 'POST',
      body: new FormData(form),
      credentials: 'include'
    });
    const result = await response.json();
    status.textContent = result.ok
      ? 'NDA submitted. We will be in touch shortly.'
      : 'Submission failed. Please check your file and try again.';
    if (result.ok) { form.reset(); document.getElementById('file-name').textContent = 'Choose signed NDA'; }
  } catch (error) {
    status.textContent = 'Unable to submit right now. Please try again.';
  } finally {
    if (btn) btn.disabled = false;
  }
});
