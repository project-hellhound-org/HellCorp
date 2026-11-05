// Cart & Checkout Component

function renderCart() {
  const root = document.getElementById('app-root');

  if (state.cart.length === 0) {
    root.innerHTML = `
      <div class="animate-in">
        <div class="section-header mb-24"><h1 class="section-title">CART</h1></div>
        <div class="empty-state">
          <div class="empty-state-icon">🛒</div>
          <div class="empty-state-text">YOUR CART IS EMPTY</div>
          <button class="btn btn-primary mt-24" onclick="router.navigate('/')">BROWSE CATALOG</button>
        </div>
      </div>
    `;
    return;
  }

  const total = state.cart.reduce((s, i) => s + (i.price * i.quantity), 0);

  root.innerHTML = `
    <div class="animate-in">
      <div class="section-header mb-24"><h1 class="section-title">CART</h1><span class="section-subtitle">${state.cart.length} ITEMS</span></div>

      <div class="card mb-24">
        <div class="card-body">
          <div class="table-wrap"><table class="data-table">
            <tr><th>ITEM</th><th>PRODUCT ID</th><th>PRICE</th><th>QTY</th><th>SUBTOTAL</th><th></th></tr>
            ${state.cart.map((item, i) => `
              <tr>
                <td>${item.name}</td>
                <td class="text-xs text-muted">${item.product_id || ''}</td>
                <td>$${parseFloat(item.price).toLocaleString()}</td>
                <td>
                  <div class="flex gap-8" style="align-items:center;">
                    <button class="btn btn-sm btn-secondary" onclick="updateCartQty(${i}, -1)">−</button>
                    <span>${item.quantity}</span>
                    <button class="btn btn-sm btn-secondary" onclick="updateCartQty(${i}, 1)">+</button>
                  </div>
                </td>
                <td class="text-red">$${(item.price * item.quantity).toLocaleString()}</td>
                <td><button class="btn btn-sm btn-danger" onclick="removeFromCart(${i})">✕</button></td>
              </tr>
            `).join('')}
          </table></div>

          <div style="text-align:right;margin-top:24px;padding-top:24px;border-top:2px solid var(--edge);">
            <span class="text-off text-sm">TOTAL: </span>
            <span class="text-brutal text-red" style="font-size:36px;">$${total.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div class="flex-between">
        <button class="btn btn-secondary" onclick="clearCart()">CLEAR CART</button>
        <button class="btn btn-primary" onclick="router.navigate('/checkout')">PROCEED TO CHECKOUT →</button>
      </div>
    </div>
  `;
}

function updateCartQty(index, delta) {
  state.cart[index].quantity += delta;
  if (state.cart[index].quantity <= 0) state.cart.splice(index, 1);
  saveCart();
  updateNavCartCount();
  renderCart();
}

function removeFromCart(index) {
  state.cart.splice(index, 1);
  saveCart();
  updateNavCartCount();
  renderCart();
}

function clearCart() {
  state.cart = [];
  saveCart();
  updateNavCartCount();
  renderCart();
}

function renderCheckout() {
  if (!state.user) { router.navigate('/login'); return; }
  if (state.cart.length === 0) { router.navigate('/cart'); return; }

  const total = state.cart.reduce((s, i) => s + (i.price * i.quantity), 0);
  const root = document.getElementById('app-root');

  root.innerHTML = `
    <div class="animate-in">
      <div class="section-header mb-24"><h1 class="section-title">CHECKOUT</h1><span class="section-subtitle">SECURE ESCROW PAYMENT</span></div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;">
        <!-- Order Summary -->
        <div class="card">
          <div class="card-header"><span class="text-brutal text-red" style="font-size:16px;">ORDER SUMMARY</span></div>
          <div class="card-body">
            ${state.cart.map(i => `
              <div class="flex-between mb-8" style="padding:8px 0;border-bottom:1px solid var(--edge);">
                <span class="text-sm">${i.name} × ${i.quantity}</span>
                <span class="text-red">$${(i.price * i.quantity).toLocaleString()}</span>
              </div>
            `).join('')}
            <div class="flex-between mt-16" style="padding-top:16px;border-top:2px solid var(--edge);">
              <span class="text-off">TOTAL</span>
              <span class="text-brutal text-red" style="font-size:28px;">$${total.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <!-- Payment Form -->
        <div class="card">
          <div class="card-header"><span class="text-brutal text-red" style="font-size:16px;">PAYMENT DETAILS</span></div>
          <div class="card-body">
            <div class="form-group">
              <label class="form-label">PAYMENT METHOD</label>
              <select id="checkout-payment" class="form-select">
                <option value="XMR">Monero (XMR) — Recommended</option>
                <option value="BTC">Bitcoin (BTC)</option>
                <option value="ETH">Ethereum (ETH)</option>
                <option value="USDT">Tether (USDT)</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">DELIVERY ADDRESS / NOTES</label>
              <textarea id="checkout-address" class="form-textarea" placeholder="Encrypted delivery notes, PGP preferred...">${''}</textarea>
            </div>
            <div style="background:var(--void);border:1px solid var(--edge);padding:16px;margin-bottom:24px;">
              <p class="text-xs text-off">⚠ ESCROW: Funds will be held in escrow until delivery is confirmed. No refunds after release.</p>
            </div>
            <button class="btn btn-primary w-full" onclick="placeOrder()" id="checkout-btn" style="font-size:18px;padding:16px;">PLACE ORDER — $${total.toLocaleString()}</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

async function placeOrder() {
  const btn = document.getElementById('checkout-btn');
  btn.textContent = 'PROCESSING...';
  btn.disabled = true;

  const items = state.cart.map(i => ({
    product_id: i.id,
    quantity: i.quantity,
    price: i.price
  }));

  const data = await fetchAPI('/api/v1/orders', {
    method: 'POST',
    body: {
      items,
      payment_method: document.getElementById('checkout-payment').value,
      shipping_address: document.getElementById('checkout-address').value
    }
  });

  if (data.success) {
    state.cart = [];
    saveCart();
    updateNavCartCount();

    document.getElementById('app-root').innerHTML = `
      <div class="animate-in" style="text-align:center;padding:60px 0;">
        <div style="font-size:64px;margin-bottom:24px;">✓</div>
        <h1 class="text-brutal text-red" style="font-size:48px;">ORDER CONFIRMED</h1>
        <p class="text-off mt-8">Your order has been placed and escrow initiated.</p>
        <div class="card mt-24" style="max-width:400px;margin:0 auto;">
          <div class="card-body" style="text-align:left;">
            <p class="text-sm"><strong class="text-off">Order ID:</strong> <span class="text-white">${data.orderId}</span></p>
            <p class="text-sm"><strong class="text-off">Total:</strong> <span class="text-red">$${data.total}</span></p>
            <p class="text-sm"><strong class="text-off">Status:</strong> <span class="text-yellow">ESCROW HELD</span></p>
          </div>
        </div>
        <button class="btn btn-primary mt-24" onclick="router.navigate('/dashboard')">VIEW DASHBOARD</button>
      </div>
    `;
  } else {
    btn.textContent = 'PLACE ORDER';
    btn.disabled = false;
    showToast(data.error || 'Order failed', 'error');
  }
}
