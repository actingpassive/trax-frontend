const status = document.getElementById('trades-status');
const login = document.getElementById('trades-login');

async function loadTradeAccess() {
  try {
    const base = (typeof API_BASE !== 'undefined' ? API_BASE : (typeof window !== 'undefined' && window.API_BASE ? window.API_BASE : ''));
    const response = await fetch(`${base}/api/whoami?t=` + Date.now(), {
      credentials: 'include',
      cache: 'no-store'
    });
    const auth = await response.json();

    if (!auth.user) {
      status.textContent = 'Sign in with Discord to view private resources.';
      login.hidden = false;
      return;
    }

    login.hidden = true;
    status.textContent = auth.isOwner || auth.isWhitelisted
      ? 'Private resources are available for your account.'
      : 'Your Discord account does not have trades access yet.';
  } catch (error) {
    status.textContent = 'Unable to check trades access.';
  }
}

loadTradeAccess();
