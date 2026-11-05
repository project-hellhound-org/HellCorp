// Profile Component — Self XSS via custom JS, CSS Injection

async function renderProfile() {
  if (!state.user) { router.navigate('/login'); return; }
  const root = document.getElementById('app-root');
  root.innerHTML = '<div class="loading-text">Loading profile...<span class="cursor">_</span></div>';

  const data = await fetchAPI('/api/v1/profile');
  if (!data.success) { root.innerHTML = '<div class="empty-state"><div class="empty-state-text">Failed to load profile</div></div>'; return; }
  const u = data.user;

  root.innerHTML = `
    <div class="animate-in">
      <div class="section-header mb-24"><h1 class="section-title">PROFILE</h1><span class="badge badge-${u.role}">${u.role.toUpperCase()}</span></div>

      <div class="stats-grid mb-24">
        <div class="stat-card"><div class="stat-label">USERNAME</div><div class="stat-value" style="font-size:20px;color:var(--white);">${u.username}</div></div>
        <div class="stat-card"><div class="stat-label">BALANCE</div><div class="stat-value">$${u.balance||0}</div></div>
        <div class="stat-card"><div class="stat-label">VERIFIED</div><div class="stat-value" style="font-size:20px;">${u.is_verified ? '✓ YES' : '✗ NO'}</div></div>
        <div class="stat-card"><div class="stat-label">MEMBER SINCE</div><div class="stat-value" style="font-size:14px;color:var(--off);">${new Date(u.created_at).toLocaleDateString()}</div></div>
      </div>

      <div class="card mb-24"><div class="card-header"><span class="text-brutal text-red" style="font-size:16px;">EDIT PROFILE</span></div>
      <div class="card-body">
        <div class="form-group"><label class="form-label">NICKNAME</label><input type="text" id="prof-nickname" class="form-input" value="${u.nickname||''}"></div>
        <div class="form-group"><label class="form-label">EMAIL</label><input type="email" id="prof-email" class="form-input" value="${u.email||''}"></div>
        <div class="form-group"><label class="form-label">BIO</label><textarea id="prof-bio" class="form-textarea">${u.bio||''}</textarea></div>
        <div class="form-group"><label class="form-label">SHIPPING ADDRESS</label><textarea id="prof-address" class="form-textarea" style="min-height:80px;">${u.address||''}</textarea></div>
        <button class="btn btn-primary" onclick="updateProfile()">SAVE CHANGES</button>
        <div id="profile-result" class="mt-16"></div>
      </div></div>

      <div class="card mb-24"><div class="card-header"><span class="text-brutal text-red" style="font-size:16px;">CUSTOM JAVASCRIPT</span></div>
      <div class="card-body">
        <p class="text-off text-xs mb-8">Add custom JavaScript to personalize your profile page. This code runs when you visit your profile.</p>
        <div class="form-group"><label class="form-label">JAVASCRIPT</label><textarea id="prof-customjs" class="form-textarea" style="min-height:120px;" placeholder="// Your custom JS here...">${u.custom_js||''}</textarea></div>
        <button class="btn btn-secondary" onclick="saveCustomJS()">SAVE SCRIPT</button>
      </div></div>

      <div class="card mb-24"><div class="card-header"><span class="text-brutal text-red" style="font-size:16px;">CUSTOM CSS</span></div>
      <div class="card-body">
        <div class="form-group"><label class="form-label">STYLESHEET</label><textarea id="prof-customcss" class="form-textarea" style="min-height:80px;" placeholder="/* Custom styles */">${u.custom_css||''}</textarea></div>
        <button class="btn btn-secondary" onclick="saveCustomCSS()">SAVE STYLES</button>
      </div></div>

      <div class="card"><div class="card-header"><span class="text-brutal text-red" style="font-size:16px;">CHANGE PASSWORD</span></div>
      <div class="card-body">
        <div class="form-group"><label class="form-label">CURRENT PASSWORD</label><input type="password" id="prof-oldpass" class="form-input"></div>
        <div class="form-group"><label class="form-label">NEW PASSWORD</label><input type="password" id="prof-newpass" class="form-input"></div>
        <button class="btn btn-danger" onclick="changePassword()">CHANGE PASSWORD</button>
      </div></div>
    </div>
  `;

  // VULNERABLE: Self XSS — execute user's custom JS
  if (u.custom_js) {
    try { eval(u.custom_js); } catch (e) { console.error('[Profile] Custom JS error:', e); }
  }
  // Apply custom CSS
  if (u.custom_css) {
    const style = document.createElement('style');
    style.textContent = u.custom_css;
    document.head.appendChild(style);
  }
}

async function updateProfile() {
  const data = await fetchAPI('/api/v1/profile', { method: 'PUT', body: {
    nickname: document.getElementById('prof-nickname').value,
    email: document.getElementById('prof-email').value,
    bio: document.getElementById('prof-bio').value,
    address: document.getElementById('prof-address').value
  }});
  document.getElementById('profile-result').innerHTML = data.success
    ? '<div class="text-green text-sm">Profile updated</div>'
    : '<div class="text-red text-sm">' + data.error + '</div>';
  if (data.success) showToast('Profile saved', 'success');
}

async function saveCustomJS() {
  const data = await fetchAPI('/api/v1/profile', { method: 'PUT', body: { custom_js: document.getElementById('prof-customjs').value } });
  showToast(data.success ? 'Script saved — will run on next profile load' : 'Failed: ' + data.error, data.success ? 'success' : 'error');
}

async function saveCustomCSS() {
  const data = await fetchAPI('/api/v1/profile', { method: 'PUT', body: { custom_css: document.getElementById('prof-customcss').value } });
  showToast(data.success ? 'Styles saved' : 'Failed: ' + data.error, data.success ? 'success' : 'error');
}

async function changePassword() {
  showToast('Password change not implemented yet', 'info');
}
