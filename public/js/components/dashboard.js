// Dashboard Component — Buyer dashboard with stats and orders

async function renderDashboard() {
  if (!state.user) { router.navigate('/login'); return; }
  const root = document.getElementById('app-root');

  const ordersData = await fetchAPI('/api/v1/orders');
  const orders = ordersData.data || [];
  const totalSpent = orders.reduce((s, o) => s + parseFloat(o.total || 0), 0);

  root.innerHTML = `
    <div class="animate-in">
      <div class="section-header mb-24">
        <h1 class="section-title">DASHBOARD</h1>
        <span class="section-subtitle">WELCOME BACK, ${state.user.username.toUpperCase()}</span>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">TOTAL ORDERS</div>
          <div class="stat-value">${orders.length}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">TOTAL SPENT</div>
          <div class="stat-value">$${totalSpent.toLocaleString()}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">ACCOUNT BALANCE</div>
          <div class="stat-value">$${state.user.balance || 0}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">CART ITEMS</div>
          <div class="stat-value">${state.cart.length}</div>
        </div>
      </div>

      <!-- Quick Links -->
      <div class="stats-grid mt-24">
        <div class="stat-card" style="cursor:pointer;text-align:center;" onclick="router.navigate('/cart')">
          <div class="stat-label">🛒 CART</div>
          <div class="text-off text-sm mt-8">View cart & checkout</div>
        </div>
        <div class="stat-card" style="cursor:pointer;text-align:center;" onclick="router.navigate('/messages')">
          <div class="stat-label">💬 MESSAGES</div>
          <div class="text-off text-sm mt-8">Private messaging</div>
        </div>
        <div class="stat-card" style="cursor:pointer;text-align:center;" onclick="router.navigate('/support')">
          <div class="stat-label">🎫 SUPPORT</div>
          <div class="text-off text-sm mt-8">Submit tickets</div>
        </div>
        <div class="stat-card" style="cursor:pointer;text-align:center;" onclick="router.navigate('/profile')">
          <div class="stat-label">👤 PROFILE</div>
          <div class="text-off text-sm mt-8">Account settings</div>
        </div>
      </div>

      <!-- Recent Orders -->
      <div class="card mt-24">
        <div class="card-header">
          <span class="text-brutal text-red" style="font-size:16px;">RECENT ORDERS</span>
          <a href="/export/orders.csv" class="btn btn-sm btn-secondary">EXPORT CSV</a>
        </div>
        <div class="card-body">
          ${orders.length === 0 ? '<div class="empty-state"><div class="empty-state-text">No orders yet</div></div>' : `
          <div class="table-wrap"><table class="data-table">
            <tr><th>ORDER ID</th><th>PRODUCTS</th><th>TOTAL</th><th>STATUS</th><th>PAYMENT</th><th>DATE</th></tr>
            ${orders.map(o => `
              <tr>
                <td class="text-sm">${o.order_id || ''}</td>
                <td class="text-xs">${o.products || 'N/A'}</td>
                <td class="text-red">$${o.total || 0}</td>
                <td><span class="ticket-status ${o.status==='completed'?'closed':'open'}">${o.status || 'pending'}</span></td>
                <td class="text-xs">${o.payment_method || 'XMR'}</td>
                <td class="text-xs">${new Date(o.created_at).toLocaleDateString()}</td>
              </tr>
            `).join('')}
          </table></div>`}
        </div>
      </div>
    </div>
  `;
}
