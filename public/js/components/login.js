// Login & Register Components
// Reflected XSS via redirect parameter and error messages

function renderLogin() {
  const root = document.getElementById('app-root');
  // VULNERABLE: Reflected XSS — redirect param from URL reflected in page
  const hash = window.location.hash;
  const redirectParam = new URLSearchParams(hash.split('?')[1] || '').get('redirect') || '';

  root.innerHTML = `
    <div class="auth-page animate-in">
      <div class="auth-card">
        <h1 class="auth-title">ACCESS SYSTEM</h1>
        <p class="auth-subtitle">ENTER CREDENTIALS TO CONTINUE</p>
        ${redirectParam ? `<div class="text-off text-xs mb-16">Redirect: ${redirectParam}</div>` : ''}
        <div id="auth-error" class="form-error mb-16" style="display:none;"></div>
        <form onsubmit="return handleLogin(event)">
          <div class="form-group">
            <label class="form-label">USERNAME</label>
            <input type="text" id="login-username" class="form-input" placeholder="Enter username" autocomplete="username" required>
          </div>
          <div class="form-group">
            <label class="form-label">PASSWORD</label>
            <input type="password" id="login-password" class="form-input" placeholder="Enter password" autocomplete="current-password" required>
          </div>
          <button type="submit" class="btn btn-primary w-full" id="login-btn">ACCESS SYSTEM</button>
        </form>
        <div class="mt-24" style="text-align:center;">
          <a href="#/register" class="text-off text-sm" onclick="router.navigate('/register')">CREATE NEW IDENTITY</a>
          <span class="text-muted mx-8">|</span>
          <a href="#" class="text-off text-sm" onclick="showResetForm()">FORGOT PASSWORD</a>
        </div>
        <div class="mt-24" style="border-top:1px solid var(--edge);padding-top:16px;">
          <p class="text-muted text-xs" style="text-align:center;">ALTERNATIVE: <a href="#" onclick="showNoSQLLogin()" class="text-red">NoSQL AUTH</a> | <a href="#" onclick="showLDAPLogin()" class="text-red">LDAP AUTH</a> | <a href="#" onclick="showPartnerLogin()" class="text-red">PARTNER</a></p>
        </div>
      </div>
    </div>
  `;
}

async function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById('login-username').value;
  const password = document.getElementById('login-password').value;
  const btn = document.getElementById('login-btn');
  btn.textContent = 'AUTHENTICATING...';
  btn.disabled = true;

  const data = await login(username, password);

  if (!data.success) {
    btn.textContent = 'ACCESS SYSTEM';
    btn.disabled = false;
    const errorDiv = document.getElementById('auth-error');
    errorDiv.style.display = 'block';
    // VULNERABLE: Server error message rendered with innerHTML — Reflected XSS if error contains HTML
    errorDiv.innerHTML = data.error || 'Authentication failed';
    if (data.detail) errorDiv.innerHTML += '<br><span class="text-muted text-xs">' + data.detail + '</span>';
  }
  return false;
}

function renderRegister() {
  const root = document.getElementById('app-root');
  root.innerHTML = `
    <div class="auth-page animate-in">
      <div class="auth-card">
        <h1 class="auth-title">CREATE IDENTITY</h1>
        <p class="auth-subtitle">REGISTER NEW ACCOUNT</p>
        <div id="auth-error" class="form-error mb-16" style="display:none;"></div>
        <form onsubmit="return handleRegister(event)">
          <div class="form-group">
            <label class="form-label">USERNAME</label>
            <input type="text" id="reg-username" class="form-input" placeholder="Choose username" required>
          </div>
          <div class="form-group">
            <label class="form-label">EMAIL</label>
            <input type="email" id="reg-email" class="form-input" placeholder="your@email.onion">
          </div>
          <div class="form-group">
            <label class="form-label">PASSWORD</label>
            <input type="password" id="reg-password" class="form-input" placeholder="Strong password" required>
          </div>
          <div class="form-group">
            <label class="form-label">NICKNAME</label>
            <input type="text" id="reg-nickname" class="form-input" placeholder="Display name (optional)">
            <span class="form-hint">This name will be displayed publicly</span>
          </div>
          <button type="submit" class="btn btn-primary w-full" id="reg-btn">CREATE IDENTITY</button>
        </form>
        <div class="mt-24" style="text-align:center;">
          <a href="#/login" class="text-off text-sm" onclick="router.navigate('/login')">ALREADY HAVE AN ACCOUNT? LOGIN</a>
        </div>
      </div>
    </div>
  `;
}

async function handleRegister(e) {
  e.preventDefault();
  const btn = document.getElementById('reg-btn');
  btn.textContent = 'CREATING...';
  btn.disabled = true;
  await register(
    document.getElementById('reg-username').value,
    document.getElementById('reg-email').value,
    document.getElementById('reg-password').value,
    document.getElementById('reg-nickname').value
  );
  btn.textContent = 'CREATE IDENTITY';
  btn.disabled = false;
  return false;
}

function showResetForm() {
  const root = document.getElementById('app-root');
  root.innerHTML = `
    <div class="auth-page animate-in">
      <div class="auth-card">
        <h1 class="auth-title">RESET PASSWORD</h1>
        <p class="auth-subtitle">ENTER YOUR EMAIL TO RECEIVE RESET LINK</p>
        <div id="reset-result" class="mb-16"></div>
        <form onsubmit="return handleReset(event)">
          <div class="form-group">
            <label class="form-label">EMAIL ADDRESS</label>
            <input type="email" id="reset-email" class="form-input" placeholder="your@email.onion" required>
          </div>
          <button type="submit" class="btn btn-primary w-full">SEND RESET LINK</button>
        </form>
        <div class="mt-16" style="text-align:center;"><a href="#/login" class="text-off text-sm">BACK TO LOGIN</a></div>
      </div>
    </div>
  `;
}

async function handleReset(e) {
  e.preventDefault();
  const email = document.getElementById('reset-email').value;
  const data = await fetchAPI('/reset-password', { method: 'POST', body: { email } });
  document.getElementById('reset-result').innerHTML = `<div class="text-green text-sm">${data.message}</div>`;
  if (data.debug) {
    document.getElementById('reset-result').innerHTML += `<div class="code-block mt-8 text-xs">${JSON.stringify(data.debug, null, 2)}</div>`;
  }
  return false;
}

function showNoSQLLogin() {
  const root = document.getElementById('app-root');
  root.innerHTML = `
    <div class="auth-page animate-in">
      <div class="auth-card">
        <h1 class="auth-title">NoSQL AUTH</h1>
        <p class="auth-subtitle">MONGODB AUTHENTICATION SERVICE</p>
        <div id="auth-error" class="form-error mb-16" style="display:none;"></div>
        <form onsubmit="return handleNoSQLLogin(event)">
          <div class="form-group">
            <label class="form-label">USERNAME</label>
            <input type="text" id="nosql-username" class="form-input" placeholder="username" required>
          </div>
          <div class="form-group">
            <label class="form-label">PASSWORD</label>
            <input type="password" id="nosql-password" class="form-input" placeholder="password" required>
          </div>
          <button type="submit" class="btn btn-primary w-full">AUTHENTICATE</button>
        </form>
        <div class="mt-16" style="text-align:center;"><a href="#/login" class="text-off text-sm">BACK TO LOGIN</a></div>
      </div>
    </div>
  `;
}

async function handleNoSQLLogin(e) {
  e.preventDefault();
  const data = await fetchAPI('/api/v1/auth/login', {
    method: 'POST',
    body: { username: document.getElementById('nosql-username').value, password: document.getElementById('nosql-password').value }
  });
  if (data.success) {
    state.user = data.user;
    localStorage.setItem('hc_user', JSON.stringify(data.user));
    updateNav();
    showToast('NoSQL auth successful', 'success');
    router.navigate('/dashboard');
  } else {
    document.getElementById('auth-error').style.display = 'block';
    document.getElementById('auth-error').innerHTML = data.error;
  }
  return false;
}

function showLDAPLogin() {
  const root = document.getElementById('app-root');
  root.innerHTML = `
    <div class="auth-page animate-in">
      <div class="auth-card">
        <h1 class="auth-title">LDAP AUTH</h1>
        <p class="auth-subtitle">CORPORATE DIRECTORY AUTHENTICATION</p>
        <div id="auth-error" class="form-error mb-16" style="display:none;"></div>
        <form onsubmit="return handleLDAPLogin(event)">
          <div class="form-group">
            <label class="form-label">UID</label>
            <input type="text" id="ldap-username" class="form-input" placeholder="uid" required>
          </div>
          <div class="form-group">
            <label class="form-label">PASSWORD</label>
            <input type="password" id="ldap-password" class="form-input" placeholder="password">
          </div>
          <button type="submit" class="btn btn-primary w-full">AUTHENTICATE VIA LDAP</button>
        </form>
        <div class="mt-16" style="text-align:center;"><a href="#/login" class="text-off text-sm">BACK TO LOGIN</a></div>
      </div>
    </div>
  `;
}

async function handleLDAPLogin(e) {
  e.preventDefault();
  const data = await fetchAPI('/admin/ldap-login', {
    method: 'POST',
    body: { username: document.getElementById('ldap-username').value, password: document.getElementById('ldap-password').value }
  });
  if (data.success) {
    state.user = { username: data.user.uid, role: 'admin', email: data.user.mail };
    localStorage.setItem('hc_user', JSON.stringify(state.user));
    updateNav();
    showToast('LDAP auth successful — ' + data.entriesFound + ' entries matched', 'success');
    router.navigate('/admin');
  } else {
    document.getElementById('auth-error').style.display = 'block';
    document.getElementById('auth-error').innerHTML = data.error;
  }
  return false;
}

function showPartnerLogin() {
  const root = document.getElementById('app-root');
  root.innerHTML = `
    <div class="auth-page animate-in">
      <div class="auth-card">
        <h1 class="auth-title">PARTNER AUTH</h1>
        <p class="auth-subtitle">XML/XPATH PARTNER AUTHENTICATION</p>
        <div id="auth-error" class="form-error mb-16" style="display:none;"></div>
        <div id="partner-result" class="mb-16"></div>
        <form onsubmit="return handlePartnerLogin(event)">
          <div class="form-group">
            <label class="form-label">PARTNER USERNAME</label>
            <input type="text" id="partner-username" class="form-input" placeholder="partner username" required>
          </div>
          <div class="form-group">
            <label class="form-label">PARTNER PASSWORD</label>
            <input type="password" id="partner-password" class="form-input" placeholder="partner password" required>
          </div>
          <button type="submit" class="btn btn-primary w-full">AUTHENTICATE</button>
        </form>
        <div class="mt-16" style="text-align:center;"><a href="#/login" class="text-off text-sm">BACK TO LOGIN</a></div>
      </div>
    </div>
  `;
}

async function handlePartnerLogin(e) {
  e.preventDefault();
  const data = await fetchAPI('/xml/partner-login', {
    method: 'POST',
    body: { username: document.getElementById('partner-username').value, password: document.getElementById('partner-password').value }
  });
  const resultDiv = document.getElementById('partner-result');
  if (data.success) {
    resultDiv.innerHTML = `<div class="code-block text-green">${JSON.stringify(data.partner, null, 2)}</div>`;
    showToast('Partner authenticated: ' + data.partner.username, 'success');
  } else {
    resultDiv.innerHTML = `<div class="text-red text-sm">${data.error}</div>`;
  }
  return false;
}
