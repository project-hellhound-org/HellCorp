// Admin Panel Component — Tabbed interface
// Vulnerabilities: Blind XSS in logs, Code Injection in discounts, EL Injection, Mass Assignment

function renderAdmin() {
  if (!state.user || state.user.role !== 'admin') {
    document.getElementById('app-root').innerHTML = '<div class="empty-state"><div class="empty-state-icon">🔒</div><div class="empty-state-text">ADMIN ACCESS REQUIRED</div></div>';
    return;
  }

  const root = document.getElementById('app-root');
  root.innerHTML = `
    <div class="animate-in">
      <div class="section-header mb-24">
        <h1 class="section-title">ADMIN PANEL</h1>
        <span class="section-subtitle">SYSTEM ADMINISTRATION</span>
      </div>

      <div class="tabs">
        <button class="tab active" onclick="switchAdminTab('users', this)">USERS</button>
        <button class="tab" onclick="switchAdminTab('logs', this)">LOGS</button>
        <button class="tab" onclick="switchAdminTab('announce', this)">ANNOUNCE</button>
        <button class="tab" onclick="switchAdminTab('discounts', this)">DISCOUNTS</button>
        <button class="tab" onclick="switchAdminTab('config', this)">CONFIG</button>
        <button class="tab" onclick="switchAdminTab('eleval', this)">EL-EVAL</button>
        <button class="tab" onclick="switchAdminTab('reports', this)">REPORTS</button>
        <button class="tab" onclick="switchAdminTab('ldap', this)">LDAP</button>
        <button class="tab" onclick="switchAdminTab('transactions', this)">TXNS</button>
      </div>

      <div id="admin-tab-content"></div>
    </div>
  `;
  loadAdminUsers();
}

function switchAdminTab(tab, btn) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  const fns = { users: loadAdminUsers, logs: loadAdminLogs, announce: loadAdminAnnounce, discounts: loadAdminDiscounts, config: loadAdminConfig, eleval: loadAdminEL, reports: loadAdminReports, ldap: loadAdminLDAP, transactions: loadAdminTransactions };
  fns[tab]?.();
}

async function loadAdminUsers() {
  const container = document.getElementById('admin-tab-content');
  container.innerHTML = `
    <div class="card">
      <div class="card-header">
        <span class="text-brutal text-red" style="font-size:16px;">USER MANAGEMENT</span>
        <div class="flex gap-8"><input type="text" id="admin-user-search" class="form-input" style="width:250px;" placeholder="Search users..." onkeydown="if(event.key==='Enter')searchAdminUsers()"><button class="btn btn-sm btn-secondary" onclick="searchAdminUsers()">SEARCH</button></div>
      </div>
      <div class="card-body"><div id="admin-users-table">Loading...</div></div>
    </div>
  `;
  searchAdminUsers();
}

async function searchAdminUsers() {
  const search = document.getElementById('admin-user-search')?.value || '';
  const data = await fetchAPI('/admin/users?search=' + encodeURIComponent(search));
  const users = data.users || [];
  document.getElementById('admin-users-table').innerHTML = `
    <div class="table-wrap"><table class="data-table">
      <tr><th>ID</th><th>USERNAME</th><th>EMAIL</th><th>ROLE</th><th>NICKNAME</th><th>BALANCE</th><th>ACTIONS</th></tr>
      ${users.map(u => `<tr>
        <td>${u.id}</td><td>${u.username}</td><td>${u.email||''}</td>
        <td><span class="badge badge-${u.role}">${u.role}</span></td>
        <td>${u.nickname||''}</td><td>$${u.balance||0}</td>
        <td><button class="btn btn-sm btn-secondary" onclick="viewAdminUser(${u.id})">VIEW</button></td>
      </tr>`).join('')}
    </table></div>
  `;
}

async function viewAdminUser(id) {
  const data = await fetchAPI('/admin/user/' + id);
  if (!data.success) return showToast(data.error, 'error');
  const u = data.user;
  openModal(`
    <button class="modal-close" onclick="closeModal()">&times;</button>
    <h3 class="text-brutal text-red" style="font-size:20px;">USER: ${u.username}</h3>
    <div class="mt-16">
      <p class="text-sm"><strong class="text-off">ID:</strong> ${u.id}</p>
      <p class="text-sm"><strong class="text-off">Email:</strong> ${u.email||'N/A'}</p>
      <p class="text-sm"><strong class="text-off">Role:</strong> ${u.role}</p>
      <p class="text-sm"><strong class="text-off">Nickname:</strong> ${u.nickname||'N/A'}</p>
      <p class="text-sm"><strong class="text-off">Bio:</strong> ${u.bio||'N/A'}</p>
      <p class="text-sm"><strong class="text-off">Balance:</strong> $${u.balance}</p>
      <p class="text-sm"><strong class="text-off">Verified:</strong> ${u.is_verified ? 'Yes' : 'No'}</p>
      <p class="text-sm"><strong class="text-off">Private Key:</strong> <code>${u.private_key||'N/A'}</code></p>
    </div>
    ${data.recentLogs?.length ? `<div class="mt-16"><h4 class="text-off text-xs">RECENT LOGS</h4><div class="code-block text-xs mt-8">${data.recentLogs.map(l => JSON.stringify(l)).join('\n')}</div></div>` : ''}
    ${data.logError ? `<div class="text-red text-xs mt-8">Log query error: ${data.logError}</div>` : ''}
  `);
}

async function loadAdminLogs() {
  const container = document.getElementById('admin-tab-content');
  const data = await fetchAPI('/admin/logs?limit=50');
  const logs = data.logs || [];
  container.innerHTML = `
    <div class="card"><div class="card-header"><span class="text-brutal text-red" style="font-size:16px;">AUDIT LOGS</span></div>
    <div class="card-body"><div class="table-wrap"><table class="data-table">
      <tr><th>TIMESTAMP</th><th>IP</th><th>METHOD</th><th>URL</th><th>USER-AGENT</th></tr>
      ${logs.map(l => `<tr><td class="text-xs">${l.timestamp||''}</td><td>${l.ip||''}</td><td>${l.method||''}</td><td class="text-xs">${l.url||''}</td><td class="text-xs">${l.userAgent||''}</td></tr>`).join('')}
    </table></div></div></div>
  `;
}

function loadAdminAnnounce() {
  document.getElementById('admin-tab-content').innerHTML = `
    <div class="card"><div class="card-body">
      <h3 class="text-brutal text-red mb-16" style="font-size:16px;">POST ANNOUNCEMENT</h3>
      <div class="form-group"><label class="form-label">TITLE</label><input type="text" id="announce-title" class="form-input" placeholder="Announcement title"></div>
      <div class="form-group"><label class="form-label">CONTENT</label><textarea id="announce-content" class="form-textarea" placeholder="Announcement content (HTML supported)"></textarea></div>
      <button class="btn btn-primary" onclick="postAnnouncement()">PUBLISH</button>
      <div id="announce-result" class="mt-16"></div>
    </div></div>
  `;
}

async function postAnnouncement() {
  const data = await fetchAPI('/admin/announcement', { method: 'POST', body: { title: document.getElementById('announce-title').value, content: document.getElementById('announce-content').value } });
  document.getElementById('announce-result').innerHTML = data.success ? '<div class="text-green text-sm">Announcement published</div>' : '<div class="text-red text-sm">' + data.error + '</div>';
}

function loadAdminDiscounts() {
  document.getElementById('admin-tab-content').innerHTML = `
    <div class="card"><div class="card-body">
      <h3 class="text-brutal text-red mb-16" style="font-size:16px;">DISCOUNT CALCULATOR</h3>
      <div class="form-group"><label class="form-label">RULE NAME</label><input type="text" id="discount-name" class="form-input" placeholder="e.g. bulk_10"></div>
      <div class="form-group"><label class="form-label">FORMULA (JavaScript)</label><textarea id="discount-formula" class="form-textarea" placeholder="e.g. price * quantity * 0.9" style="min-height:80px;"></textarea><span class="form-hint">Variables: price, quantity</span></div>
      <div class="flex gap-8">
        <div class="form-group"><label class="form-label">TEST PRICE</label><input type="number" id="discount-price" class="form-input" value="100"></div>
        <div class="form-group"><label class="form-label">TEST QTY</label><input type="number" id="discount-qty" class="form-input" value="1"></div>
      </div>
      <button class="btn btn-primary" onclick="testDiscount()">CALCULATE</button>
      <div id="discount-result" class="mt-16"></div>
    </div></div>
  `;
}

async function testDiscount() {
  const data = await fetchAPI('/admin/discount', { method: 'POST', body: { name: document.getElementById('discount-name').value, formula: document.getElementById('discount-formula').value, price: document.getElementById('discount-price').value, quantity: document.getElementById('discount-qty').value } });
  document.getElementById('discount-result').innerHTML = `<div class="code-block">${JSON.stringify(data, null, 2)}</div>`;
}

function loadAdminConfig() {
  document.getElementById('admin-tab-content').innerHTML = `
    <div class="card"><div class="card-body">
      <h3 class="text-brutal text-red mb-16" style="font-size:16px;">SITE CONFIGURATION</h3>
      <div class="form-group"><label class="form-label">CONFIG JSON</label><textarea id="config-json" class="form-textarea" style="min-height:200px;" placeholder='{"maintenance_mode": false, "debug": true}'>{}</textarea></div>
      <button class="btn btn-primary" onclick="updateConfig()">UPDATE CONFIG</button>
      <div id="config-result" class="mt-16"></div>
    </div></div>
  `;
}

async function updateConfig() {
  try {
    const body = JSON.parse(document.getElementById('config-json').value);
    const data = await fetchAPI('/admin/config', { method: 'POST', body });
    document.getElementById('config-result').innerHTML = `<div class="code-block text-green">${JSON.stringify(data, null, 2)}</div>`;
  } catch (e) { showToast('Invalid JSON', 'error'); }
}

function loadAdminEL() {
  document.getElementById('admin-tab-content').innerHTML = `
    <div class="card"><div class="card-body">
      <h3 class="text-brutal text-red mb-16" style="font-size:16px;">EXPRESSION EVALUATOR</h3>
      <div class="form-group"><label class="form-label">EXPRESSION</label><textarea id="el-expression" class="form-textarea" placeholder="Enter expression to evaluate... e.g. Math.PI * 2" style="min-height:80px;"></textarea></div>
      <button class="btn btn-primary" onclick="evalExpression()">EVALUATE</button>
      <div id="el-result" class="mt-16"></div>
    </div></div>
  `;
}

async function evalExpression() {
  const data = await fetchAPI('/admin/el-eval', { method: 'POST', body: { expression: document.getElementById('el-expression').value } });
  document.getElementById('el-result').innerHTML = `<div class="code-block">${data.success ? data.result : data.error}\n\nType: ${data.type || 'N/A'}${data.stack ? '\n\nStack: ' + data.stack : ''}</div>`;
}

async function loadAdminReports() {
  const data = await fetchAPI('/admin/reports');
  const tickets = data.tickets || [];
  const reports = data.reports || [];
  const feedback = data.feedback || [];
  document.getElementById('admin-tab-content').innerHTML = `
    <div class="card mb-16"><div class="card-header"><span class="text-brutal text-red" style="font-size:14px;">SUPPORT TICKETS (${tickets.length})</span></div>
    <div class="card-body"><div class="table-wrap"><table class="data-table">
      <tr><th>ID</th><th>USER</th><th>SUBJECT</th><th>DESCRIPTION</th><th>STATUS</th><th>DATE</th></tr>
      ${tickets.map(t => `<tr><td>${t.id}</td><td>${t.reporter||''}</td><td>${t.subject||''}</td><td>${t.description||''}</td><td>${t.status||'open'}</td><td class="text-xs">${t.created_at||''}</td></tr>`).join('')}
    </table></div></div></div>
    <div class="card mb-16"><div class="card-header"><span class="text-brutal text-red" style="font-size:14px;">REPORTS (${reports.length})</span></div>
    <div class="card-body">${reports.map(r => `<div style="border-bottom:1px solid var(--edge);padding:8px 0;"><strong class="text-xs">${r.reporter||'anon'}</strong>: ${r.reason||''}</div>`).join('') || '<p class="text-muted text-sm">No reports</p>'}</div></div>
    <div class="card"><div class="card-header"><span class="text-brutal text-red" style="font-size:14px;">FEEDBACK (${feedback.length})</span></div>
    <div class="card-body">${feedback.map(f => `<div style="border-bottom:1px solid var(--edge);padding:8px 0;">${f.message||''}</div>`).join('') || '<p class="text-muted text-sm">No feedback</p>'}</div></div>
  `;
}

function loadAdminLDAP() {
  document.getElementById('admin-tab-content').innerHTML = `
    <div class="card mb-16"><div class="card-body">
      <h3 class="text-brutal text-red mb-16" style="font-size:16px;">LDAP DIRECTORY SEARCH</h3>
      <div class="flex gap-8"><input type="text" id="ldap-search" class="form-input" placeholder="Search by uid, cn, or email..." style="flex:1;"><button class="btn btn-sm btn-primary" onclick="searchLDAP()">SEARCH</button></div>
      <div id="ldap-results" class="mt-16"></div>
    </div></div>
  `;
}

async function searchLDAP() {
  const search = document.getElementById('ldap-search').value || '*';
  const data = await fetchAPI('/internal/staff?search=' + encodeURIComponent(search));
  document.getElementById('ldap-results').innerHTML = `
    <p class="text-xs text-muted mb-8">Filter: ${data.filter || ''} | Results: ${data.count || 0}</p>
    <div class="table-wrap"><table class="data-table">
      <tr><th>UID</th><th>NAME</th><th>EMAIL</th><th>TITLE</th><th>DEPT</th></tr>
      ${(data.results||[]).map(e => `<tr><td>${e.uid||''}</td><td>${e.cn||''}</td><td>${e.mail||''}</td><td>${e.title||''}</td><td>${e.departmentNumber||''}</td></tr>`).join('')}
    </table></div>
  `;
}

async function loadAdminTransactions() {
  const container = document.getElementById('admin-tab-content');
  container.innerHTML = `
    <div class="card"><div class="card-header">
      <span class="text-brutal text-red" style="font-size:16px;">TRANSACTIONS</span>
      <div class="flex gap-8"><input type="text" id="txn-filter" class="form-input" style="width:200px;" placeholder="Filter..."><button class="btn btn-sm btn-secondary" onclick="searchTransactions()">FILTER</button>
      <a href="/export/transactions.csv" class="btn btn-sm btn-secondary">EXPORT CSV</a></div>
    </div><div class="card-body"><div id="txn-table">Loading...</div></div></div>
  `;
  searchTransactions();
}

async function searchTransactions() {
  const filter = document.getElementById('txn-filter')?.value || '';
  const data = await fetchAPI('/admin/transactions?filter=' + encodeURIComponent(filter));
  document.getElementById('txn-table').innerHTML = `<div class="table-wrap"><table class="data-table">
    <tr><th>ORDER ID</th><th>USER</th><th>TOTAL</th><th>STATUS</th><th>PAYMENT</th><th>DATE</th></tr>
    ${(data.transactions||[]).map(t => `<tr><td>${t.order_id||''}</td><td>${t.username||''}</td><td>$${t.total||0}</td><td>${t.status||''}</td><td>${t.payment_method||''}</td><td class="text-xs">${t.created_at||''}</td></tr>`).join('')}
  </table></div>`;
}
