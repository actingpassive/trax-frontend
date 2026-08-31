const file = document.getElementById('ndaFile');
const form = document.getElementById('nda-form');
const status = document.getElementById('nda-status');
const MAX_NDA_BYTES = 15 * 1024 * 1024;

function isValidNdaFile(f){
  if(!f) return {ok:false, reason:'No file selected.'};
  if(f.size > MAX_NDA_BYTES) return {ok:false, reason:'File too large — max 15 MB.'};
  const nameOk = /\.pdf$/i.test(f.name);
  const typeOk = !f.type || f.type === 'application/pdf';
  if(!nameOk || !typeOk) return {ok:false, reason:'Invalid type — PDF only (15 MB max).'};
  return {ok:true};
}

file.addEventListener('change', () => {
  const f = file.files[0];
  document.getElementById('file-name').textContent = f?.name || 'Choose signed NDA';
  const statusEl = document.getElementById('nda-status');
  if(!f){ statusEl.textContent = ''; return; }
  const v = isValidNdaFile(f);
  if(!v.ok){
    statusEl.textContent = v.reason;
    file.value = '';
    document.getElementById('file-name').textContent = 'Choose signed NDA';
    return;
  }
  statusEl.textContent = '';
});

form.addEventListener('submit', async event => {
  event.preventDefault();
  const f = file.files[0];
  if(!f){ status.textContent = 'Please choose a PDF file.'; return; }
  const v = isValidNdaFile(f);
  if(!v.ok){ status.textContent = v.reason; return; }
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
