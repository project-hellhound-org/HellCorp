// Seller Dashboard Component
// OS Command Injection (ping), SSTI (templates), Stored XSS (profile), SQLi (sales/notes)

function renderSeller() {
  if (!state.user || (state.user.role !== 'seller' && state.user.role !== 'admin')) {
    document.getElementById('app-root').innerHTML = '<div class="empty-state"><div class="empty-state-icon">🔒</div><div class="empty-state-text">SELLER ACCESS REQUIRED</div></div>';
    return;
  }
  const root = document.getElementById('app-root');
  root.innerHTML = `
    <div class="animate-in">
      <div class="section-header mb-24"><h1 class="section-title">SELLER DASHBOARD</h1><span class="section-subtitle">VENDOR OPERATIONS</span></div>
      <div class="tabs">
        <button class="tab active" onclick="switchSellerTab('inventory',this)">INVENTORY</button>
        <button class="tab" onclick="switchSellerTab('sales',this)">SALES</button>
        <button class="tab" onclick="switchSellerTab('ping',this)">PING</button>
        <button class="tab" onclick="switchSellerTab('templates',this)">TEMPLATES</button>
        <button class="tab" onclick="switchSellerTab('profile',this)">PROFILE</button>
        <button class="tab" onclick="switchSellerTab('upload',this)">UPLOAD</button>
      </div>
      <div id="seller-tab-content"></div>
    </div>
  `;
  loadSellerInventory();
}

function switchSellerTab(tab, btn) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  ({inventory: loadSellerInventory, sales: loadSellerSales, ping: loadSellerPing, templates: loadSellerTemplates, profile: loadSellerProfile, upload: loadSellerUpload})[tab]?.();
}

async function loadSellerInventory() {
  const data = await fetchAPI('/seller/inventory');
  document.getElementById('seller-tab-content').innerHTML = `
    <div class="card"><div class="card-header"><span class="text-brutal text-red" style="font-size:16px;">MY PRODUCTS</span></div>
    <div class="card-body"><div class="table-wrap"><table class="data-table">
      <tr><th>ID</th><th>NAME</th><th>CATEGORY</th><th>PRICE</th><th>TIER</th></tr>
      ${(data.products||[]).map(p => `<tr><td>${p.product_id}</td><td>${p.name}</td><td>${p.category}</td><td>$${p.price}</td><td>${p.tier}</td></tr>`).join('')}
    </table></div></div></div>
  `;
}

function loadSellerSales() {
  document.getElementById('seller-tab-content').innerHTML = `
    <div class="card"><div class="card-header"><span class="text-brutal text-red" style="font-size:16px;">SALES REPORT</span>
      <div class="flex gap-8"><input type="text" id="sales-filter" class="form-input" style="width:150px;" placeholder="Filter...">
      <input type="date" id="sales-from" class="form-input" style="width:150px;">
      <input type="date" id="sales-to" class="form-input" style="width:150px;">
      <button class="btn btn-sm btn-secondary" onclick="searchSales()">FILTER</button>
      <a href="/export/orders.csv" class="btn btn-sm btn-secondary">CSV</a></div>
    </div><div class="card-body"><div id="sales-table">Click FILTER to load...</div></div></div>
  `;
}

async function searchSales() {
  const f = document.getElementById('sales-filter')?.value||'';
  const from = document.getElementById('sales-from')?.value||'';
  const to = document.getElementById('sales-to')?.value||'';
  const data = await fetchAPI(`/seller/sales?filter=${encodeURIComponent(f)}&from=${from}&to=${to}`);
  document.getElementById('sales-table').innerHTML = `<div class="table-wrap"><table class="data-table">
    <tr><th>ORDER</th><th>BUYER</th><th>PRODUCT</th><th>QTY</th><th>PRICE</th><th>DATE</th></tr>
    ${(data.sales||[]).map(s => `<tr><td>${s.order_id||''}</td><td>${s.buyer||''}</td><td>${s.product_name||''}</td><td>${s.quantity||0}</td><td>$${s.item_price||0}</td><td class="text-xs">${s.created_at||''}</td></tr>`).join('')}
  </table></div>`;
}

function loadSellerPing() {
  document.getElementById('seller-tab-content').innerHTML = `
    <div class="card"><div class="card-body">
      <h3 class="text-brutal text-red mb-16" style="font-size:16px;">SERVER UPTIME CHECK</h3>
      <p class="text-off text-xs mb-16">Check if a delivery server is reachable via ping.</p>
      <div class="flex gap-8 mb-16"><input type="text" id="ping-host" class="form-input" placeholder="Hostname or IP address" style="flex:1;">
      <button class="btn btn-primary" onclick="doPing()" id="ping-btn">CHECK UPTIME</button></div>
      <div id="ping-output"></div>
    </div></div>
  `;
}

async function doPing() {
  const host = document.getElementById('ping-host').value;
  if (!host) return showToast('Enter a hostname', 'error');
  const btn = document.getElementById('ping-btn');
  btn.textContent = 'PINGING...'; btn.disabled = true;
  document.getElementById('ping-output').innerHTML = '<div class="terminal-output">Executing ping...\n</div>';
  const data = await fetchAPI('/seller/ping', { method: 'POST', body: { host } });
  btn.textContent = 'CHECK UPTIME'; btn.disabled = false;
  document.getElementById('ping-output').innerHTML = `
    <div class="text-xs text-muted mb-8">Command: ${data.executedCommand || data.command || ''}</div>
    <div class="terminal-output">${data.output || data.error || 'No output'}</div>
  `;
}

function loadSellerTemplates() {
  document.getElementById('seller-tab-content').innerHTML = `
    <div class="card"><div class="card-body">
      <h3 class="text-brutal text-red mb-16" style="font-size:16px;">EMAIL TEMPLATE EDITOR</h3>
      <p class="text-off text-xs mb-16">Create email templates sent to buyers after purchase. Uses Nunjucks syntax.</p>
      <div class="form-group"><label class="form-label">TEMPLATE NAME</label><input type="text" id="tpl-name" class="form-input" placeholder="e.g. purchase_confirmation"></div>
      <div class="form-group"><label class="form-label">TEMPLATE CONTENT</label>
        <textarea id="tpl-content" class="form-textarea" style="min-height:200px;" placeholder="Hello {{ buyer_name }},\n\nThank you for purchasing {{ product_name }}.\n\nOrder: {{ order_id }}">Hello {{ buyer_name }},

Thank you for purchasing {{ product_name }}.

Your order ID: {{ order_id }}
Access code: {{ access_code }}

— {{ seller_name }}</textarea></div>
      <div class="flex gap-8"><button class="btn btn-primary" onclick="previewTemplate()">PREVIEW</button><button class="btn btn-secondary" onclick="saveTemplate()">SAVE</button></div>
      <div id="tpl-preview" class="mt-16"></div>
    </div></div>
  `;
}

async function previewTemplate() {
  const data = await fetchAPI('/seller/template', { method: 'POST', body: { template: document.getElementById('tpl-content').value, name: document.getElementById('tpl-name').value } });
  document.getElementById('tpl-preview').innerHTML = data.preview?.success
    ? `<div class="card"><div class="card-header"><span class="text-xs text-off">PREVIEW</span></div><div class="card-body">${data.preview.output}</div></div>`
    : `<div class="text-red text-sm">${data.preview?.error || data.message || 'Error'}</div>`;
}

async function saveTemplate() { await previewTemplate(); showToast('Template saved', 'success'); }

function loadSellerProfile() {
  document.getElementById('seller-tab-content').innerHTML = `
    <div class="card"><div class="card-body">
      <h3 class="text-brutal text-red mb-16" style="font-size:16px;">SELLER PROFILE</h3>
      <div class="form-group"><label class="form-label">NICKNAME</label><input type="text" id="seller-nickname" class="form-input" placeholder="Display name"></div>
      <div class="form-group"><label class="form-label">BIO / ABOUT (HTML supported)</label><textarea id="seller-bio" class="form-textarea" placeholder="Tell buyers about yourself..."></textarea></div>
      <button class="btn btn-primary" onclick="updateSellerProfile()">UPDATE PROFILE</button>
      <div id="seller-profile-result" class="mt-16"></div>
    </div></div>
  `;
}

async function updateSellerProfile() {
  const data = await fetchAPI('/seller/profile', { method: 'PUT', body: { nickname: document.getElementById('seller-nickname').value, bio: document.getElementById('seller-bio').value } });
  document.getElementById('seller-profile-result').innerHTML = data.success ? '<div class="text-green text-sm">Profile updated</div>' : '<div class="text-red text-sm">' + data.error + '</div>';
}

function loadSellerUpload() {
  document.getElementById('seller-tab-content').innerHTML = `
    <div class="card"><div class="card-body">
      <h3 class="text-brutal text-red mb-16" style="font-size:16px;">UPLOAD SAMPLE</h3>
      <p class="text-off text-xs mb-16">Upload a sample file for analysis. The file will be scanned with 'strings' to extract readable content.</p>
      <form id="upload-form" enctype="multipart/form-data">
        <div class="form-group"><label class="form-label">FILE</label><input type="file" id="upload-file" class="form-input" name="sample"></div>
        <button type="button" class="btn btn-primary" onclick="uploadSample()">UPLOAD & ANALYZE</button>
      </form>
      <div id="upload-result" class="mt-16"></div>
    </div></div>
  `;
}

async function uploadSample() {
  const file = document.getElementById('upload-file').files[0];
  if (!file) return showToast('Select a file', 'error');
  const form = new FormData();
  form.append('sample', file);
  const res = await fetch('/seller/upload-sample', { method: 'POST', body: form, credentials: 'include' });
  const data = await res.json();
  document.getElementById('upload-result').innerHTML = `
    <div class="text-xs text-muted mb-8">File: ${data.filename} | Size: ${data.file?.size || 0} bytes</div>
    <div class="terminal-output">${data.analysis?.strings || 'No output'}</div>
    ${data.analysis?.error ? '<div class="text-red text-xs mt-8">' + data.analysis.error + '</div>' : ''}
  `;
}
