// HellCorp SPA Router & Application Core
// Hash-based routing with DOM-Based XSS vulnerabilities

// ─── Global State ─────────────────────────────────────────
const state = {
  user: null,
  cart: JSON.parse(localStorage.getItem('hc_cart') || '[]'),
  token: localStorage.getItem('hc_token') || null
};

// ─── API Helper ───────────────────────────────────────────
async function fetchAPI(url, options = {}) {
  const defaults = {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include'
  };
  if (state.token) {
    defaults.headers['Authorization'] = 'Bearer ' + state.token;
  }
  const merged = { ...defaults, ...options, headers: { ...defaults.headers, ...(options.headers || {}) } };
  if (merged.body && typeof merged.body === 'object') {
    merged.body = JSON.stringify(merged.body);
  }
  const res = await fetch(url, merged);
  return res.json();
}

// ─── Toast Notifications ──────────────────────────────────
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

// ─── Modal ────────────────────────────────────────────────
function openModal(html) {
  const overlay = document.getElementById('modal-overlay');
  const content = document.getElementById('modal-content');
  content.innerHTML = html;
  overlay.classList.add('active');
}
function closeModal() {
  document.getElementById('modal-overlay').classList.remove('active');
}

// ─── Router ───────────────────────────────────────────────
class Router {
  constructor() {
    this.routes = {};
    window.addEventListener('hashchange', () => this.resolve());
  }

  on(path, handler) { this.routes[path] = handler; }

  navigate(path) {
    window.location.hash = '#' + path;
  }

  resolve() {
    const hash = window.location.hash.slice(1) || '/';
    const root = document.getElementById('app-root');

    // VULNERABLE: DOM-Based XSS — hash fragment inserted into innerHTML
    const filterDisplay = document.getElementById('filter-display');
    if (hash.includes('category=')) {
      filterDisplay.style.display = 'block';
      // VULNERABLE: decodeURIComponent(hash) inserted raw into innerHTML
      filterDisplay.innerHTML = '<span class="text-xs text-off">FILTER: ' + decodeURIComponent(hash) + '</span>';
    } else {
      filterDisplay.style.display = 'none';
    }

    // VULNERABLE: Sort parameter reflected in script context
    const params = new URLSearchParams(hash.split('?')[1] || '');
    const sortParam = params.get('sort') || 'default';
    // This creates a global variable from URL input — DOM XSS
    window.__currentSort = sortParam;

    // Route matching
    const path = hash.split('?')[0];

    // Check exact routes
    if (this.routes[path]) {
      root.innerHTML = '<div class="loading-screen"><div class="loading-text">LOADING<span class="cursor">_</span></div></div>';
      setTimeout(() => this.routes[path](params), 100);
      return;
    }

    // Dynamic routes
    if (path.startsWith('/product/')) {
      const id = path.split('/product/')[1];
      root.innerHTML = '<div class="loading-screen"><div class="loading-text">LOADING<span class="cursor">_</span></div></div>';
      setTimeout(() => renderProductDetail(id), 100);
      return;
    }

    // Fallback to catalog
    if (path === '/' || !this.routes[path]) {
      root.innerHTML = '<div class="loading-screen"><div class="loading-text">LOADING<span class="cursor">_</span></div></div>';
      setTimeout(() => renderCatalog(params), 100);
    }
  }
}

const router = new Router();

// ─── PostMessage Listener ─────────────────────────────────
// VULNERABLE: DOM XSS — listens for postMessage WITHOUT origin check
window.addEventListener('message', (event) => {
  // VULNERABLE: No origin validation — any window can send messages
  // Payload: window.postMessage({type:'quickview', data:{description:'<img src=x onerror=alert(1)>'}}, '*')
  if (event.data && event.data.type === 'quickview') {
    const previewDiv = document.getElementById('modal-content');
    if (previewDiv) {
      // VULNERABLE: innerHTML from untrusted source
      openModal(`
        <button class="modal-close" onclick="closeModal()">&times;</button>
        <h3 class="text-brutal text-red" style="font-size:24px;">QUICK VIEW</h3>
        <div class="mt-16">${event.data.data.description}</div>
        <div class="mt-16 text-off text-sm">${event.data.data.details || ''}</div>
      `);
    }
  }

  if (event.data && event.data.type === 'updateCart') {
    state.cart = event.data.items || [];
    saveCart();
    updateNavCartCount();
  }
});

// ─── Cart Helpers ─────────────────────────────────────────
function addToCart(product) {
  const existing = state.cart.find(i => i.id === product.id);
  if (existing) { existing.quantity++; }
  else { state.cart.push({ ...product, quantity: 1 }); }
  saveCart();
  updateNavCartCount();
  showToast(`${product.name} added to cart`, 'success');
}

function saveCart() {
  localStorage.setItem('hc_cart', JSON.stringify(state.cart));
}

function updateNavCartCount() {
  const badge = document.getElementById('cart-badge');
  if (badge) badge.textContent = state.cart.length;
}

// ─── Nav Updates ──────────────────────────────────────────
function updateNav() {
  const navUser = document.getElementById('nav-user');
  const navLinks = document.getElementById('nav-links');

  if (state.user) {
    navUser.innerHTML = `
      <span class="user-name">${state.user.username}</span>
      <span class="badge badge-${state.user.role}">${state.user.role.toUpperCase()}</span>
      <a href="#/cart" class="btn btn-sm btn-secondary" onclick="router.navigate('/cart')">CART <span id="cart-badge">${state.cart.length}</span></a>
      <a href="#/dashboard" class="btn btn-sm" onclick="router.navigate('/dashboard')">DASHBOARD</a>
      <a href="#" class="btn btn-sm btn-secondary" onclick="logout()">LOGOUT</a>
    `;

    // Add role-specific nav links
    let extraLinks = '';
    if (state.user.role === 'admin') {
      extraLinks = '<a href="#/admin" onclick="router.navigate(\'/admin\')">ADMIN</a>';
    }
    if (state.user.role === 'seller' || state.user.role === 'admin') {
      extraLinks += '<a href="#/seller" onclick="router.navigate(\'/seller\')">SELLER</a>';
    }

    navLinks.innerHTML = `
      <a href="#/" onclick="router.navigate('/')">CATALOG</a>
      <a href="#/messages" onclick="router.navigate('/messages')">MESSAGES</a>
      <a href="#/support" onclick="router.navigate('/support')">SUPPORT</a>
      <a href="#/profile" onclick="router.navigate('/profile')">PROFILE</a>
      ${extraLinks}
      <a href="#/api-docs" onclick="router.navigate('/api-docs')">API</a>
    `;
  } else {
    navUser.innerHTML = `<a href="#/login" class="btn btn-sm btn-primary" onclick="router.navigate('/login')">ACCESS SYSTEM</a>`;
  }
}

// ─── Auth Functions ───────────────────────────────────────
async function login(username, password) {
  const data = await fetchAPI('/login', {
    method: 'POST',
    body: { username, password }
  });

  if (data.success) {
    state.user = data.user;
    state.token = data.token;
    localStorage.setItem('hc_token', data.token);
    localStorage.setItem('hc_user', JSON.stringify(data.user));
    updateNav();
    showToast('Access granted — welcome back, ' + data.user.username, 'success');
    router.navigate('/dashboard');
  } else {
    showToast(data.error || 'Authentication failed', 'error');
    // VULNERABLE: Error message from server rendered raw in error display
    const errorDiv = document.getElementById('auth-error');
    if (errorDiv) errorDiv.innerHTML = data.error || 'Authentication failed';
  }
  return data;
}

async function register(username, email, password, nickname) {
  const data = await fetchAPI('/register', {
    method: 'POST',
    body: { username, email, password, nickname }
  });
  if (data.success) {
    showToast('Account created — you may now log in', 'success');
    router.navigate('/login');
  } else {
    showToast(data.error || 'Registration failed', 'error');
    const errorDiv = document.getElementById('auth-error');
    if (errorDiv) errorDiv.innerHTML = data.error || 'Registration failed';
  }
  return data;
}

async function logout() {
  await fetchAPI('/logout');
  state.user = null;
  state.token = null;
  localStorage.removeItem('hc_token');
  localStorage.removeItem('hc_user');
  updateNav();
  showToast('Session terminated', 'info');
  router.navigate('/');
}

// ─── API Docs Page ────────────────────────────────────────
function renderApiDocs() {
  const root = document.getElementById('app-root');
  root.innerHTML = `
    <div class="animate-in">
      <div class="section-header">
        <h1 class="section-title">API DOCUMENTATION</h1>
        <span class="section-subtitle">REST API v1 + GraphQL</span>
      </div>

      <div class="card mb-24">
        <div class="card-header"><span class="text-red text-brutal" style="font-size:16px;">BASE URL</span></div>
        <div class="card-body"><code class="code-block">http://localhost:3000/api/v1/</code></div>
      </div>

      <div class="card mb-24">
        <div class="card-header"><span class="text-red text-brutal" style="font-size:16px;">ENDPOINTS</span></div>
        <div class="card-body">
          <ul class="endpoint-list">
            <li class="endpoint-item"><span class="endpoint-method get">GET</span><span class="endpoint-path">/api/v1/products</span><div class="endpoint-desc">List all products. Query: ?search=, ?category=, ?sort=</div></li>
            <li class="endpoint-item"><span class="endpoint-method get">GET</span><span class="endpoint-path">/api/v1/products/:id</span><div class="endpoint-desc">Get single product by ID or product_id</div></li>
            <li class="endpoint-item"><span class="endpoint-method put">PUT</span><span class="endpoint-path">/api/v1/products/:id</span><div class="endpoint-desc">Update product (seller/admin)</div></li>
            <li class="endpoint-item"><span class="endpoint-method post">POST</span><span class="endpoint-path">/api/v1/orders</span><div class="endpoint-desc">Create new order</div></li>
            <li class="endpoint-item"><span class="endpoint-method get">GET</span><span class="endpoint-path">/api/v1/orders</span><div class="endpoint-desc">List orders. Query: ?order_id=</div></li>
            <li class="endpoint-item"><span class="endpoint-method get">GET</span><span class="endpoint-path">/api/v1/users/:id</span><div class="endpoint-desc">Get user profile</div></li>
            <li class="endpoint-item"><span class="endpoint-method patch">PATCH</span><span class="endpoint-path">/api/v1/users/:id</span><div class="endpoint-desc">Update user profile</div></li>
            <li class="endpoint-item"><span class="endpoint-method post">POST</span><span class="endpoint-path">/api/v1/reviews</span><div class="endpoint-desc">Post a review</div></li>
            <li class="endpoint-item"><span class="endpoint-method get">GET</span><span class="endpoint-path">/api/v1/reviews/:productId</span><div class="endpoint-desc">Get reviews for product</div></li>
            <li class="endpoint-item"><span class="endpoint-method post">POST</span><span class="endpoint-path">/login</span><div class="endpoint-desc">Authenticate (SQL)</div></li>
            <li class="endpoint-item"><span class="endpoint-method post">POST</span><span class="endpoint-path">/api/v1/auth/login</span><div class="endpoint-desc">Authenticate (NoSQL)</div></li>
            <li class="endpoint-item"><span class="endpoint-method get">GET</span><span class="endpoint-path">/graphql</span><div class="endpoint-desc">GraphQL endpoint (GraphiQL enabled)</div></li>
            <li class="endpoint-item"><span class="endpoint-method post">POST</span><span class="endpoint-path">/services/payment</span><div class="endpoint-desc">SOAP payment service (?wsdl for spec)</div></li>
            <li class="endpoint-item"><span class="endpoint-method get">GET</span><span class="endpoint-path">/xml/products?category=</span><div class="endpoint-desc">XML product catalog (XPath)</div></li>
            <li class="endpoint-item"><span class="endpoint-method get">GET</span><span class="endpoint-path">/export/orders.csv</span><div class="endpoint-desc">Export orders as CSV</div></li>
          </ul>
        </div>
      </div>

      <div class="card">
        <div class="card-header"><span class="text-red text-brutal" style="font-size:16px;">AUTHENTICATION</span></div>
        <div class="card-body">
          <p class="text-off text-sm">Session-based authentication via cookies. Login to receive a session ID stored in <code>hellcorp_sid</code> cookie.</p>
          <div class="code-block mt-16">POST /login
Content-Type: application/json

{"username": "buyer1", "password": "buyer123"}</div>
        </div>
      </div>
    </div>
  `;
}

// ─── Route Registration ───────────────────────────────────
router.on('/', (params) => renderCatalog(params));
router.on('/login', () => renderLogin());
router.on('/register', () => renderRegister());
router.on('/dashboard', () => renderDashboard());
router.on('/admin', () => renderAdmin());
router.on('/seller', () => renderSeller());
router.on('/messages', () => renderMessaging());
router.on('/support', () => renderSupport());
router.on('/profile', () => renderProfile());
router.on('/cart', () => renderCart());
router.on('/checkout', () => renderCheckout());
router.on('/api-docs', () => renderApiDocs());

// ─── Initialize ───────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Restore session
  const savedUser = localStorage.getItem('hc_user');
  if (savedUser) {
    try {
      state.user = JSON.parse(savedUser);
      updateNav();
    } catch (e) {}
  }

  // Check server session
  fetchAPI('/api/v1/auth/me').then(data => {
    if (data.success && data.user) {
      state.user = data.user;
      localStorage.setItem('hc_user', JSON.stringify(data.user));
      updateNav();
    }
  }).catch(() => {});

  updateNav();
  router.resolve();
});
