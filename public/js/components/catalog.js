// Catalog Component — Product listing with search, filter, sort
// Contains Reflected XSS via search query and sort param

async function renderCatalog(params) {
  const root = document.getElementById('app-root');
  const search = params?.get('search') || '';
  const category = params?.get('category') || '';

  // Fetch products
  let url = '/api/v1/products?limit=50';
  if (search) url += '&search=' + encodeURIComponent(search);
  if (category) url += '&category=' + encodeURIComponent(category);

  const data = await fetchAPI(url);
  const products = data.data || data.products || [];
  const categories = [...new Set(products.map(p => p.category))];

  root.innerHTML = `
    <div class="animate-in">
      <!-- Hero -->
      <div class="hero">
        <h1 class="hero-title">HELL<em>CORP</em></h1>
        <p class="hero-subtitle">ENTERPRISE SOLUTIONS FOR THE DISCERNING PROFESSIONAL</p>
        <div class="hero-stats">
          <div><div class="hero-stat-value">${products.length}</div><div class="hero-stat-label">ACTIVE LISTINGS</div></div>
          <div><div class="hero-stat-value">6</div><div class="hero-stat-label">VERIFIED VENDORS</div></div>
          <div><div class="hero-stat-value">99.7%</div><div class="hero-stat-label">UPTIME</div></div>
          <div><div class="hero-stat-value">AES-256</div><div class="hero-stat-label">ENCRYPTION</div></div>
        </div>
      </div>

      <!-- Search -->
      <div class="search-bar">
        <input type="text" id="catalog-search" placeholder="Search products..." value="${search}" onkeydown="if(event.key==='Enter')searchProducts()">
        <button class="btn btn-primary" onclick="searchProducts()">SEARCH</button>
      </div>

      <!-- VULNERABLE: Reflected XSS — search query reflected in heading -->
      ${search ? `<div class="mb-16"><span class="text-off text-sm">Results for: </span><span id="search-reflect">${search}</span></div>` : ''}

      <!-- Category Filters -->
      <div class="filter-bar">
        <button class="filter-chip ${!category ? 'active' : ''}" onclick="filterCategory('')">ALL</button>
        ${categories.map(c => `
          <button class="filter-chip ${category === c ? 'active' : ''}" onclick="filterCategory('${c}')">${c.toUpperCase()}</button>
        `).join('')}
      </div>

      <!-- Product Grid -->
      <div class="product-grid" id="product-grid">
        ${products.map(p => renderProductCard(p)).join('')}
      </div>

      ${products.length === 0 ? '<div class="empty-state"><div class="empty-state-icon">🔍</div><div class="empty-state-text">No products found</div></div>' : ''}
    </div>
  `;
}

function renderProductCard(p) {
  const tierClass = p.tier === 'TIER-S' ? 'tier-s' : p.tier === 'TIER-A' ? 'tier-a' : 'tier-b';
  const specs = typeof p.specs === 'string' ? JSON.parse(p.specs || '{}') : (p.specs || {});
  return `
    <div class="product-card" onclick="router.navigate('/product/${p.id}')">
      <span class="card-tag ${tierClass}">${p.tier || 'TIER-B'}</span>
      <span class="card-tag" style="margin-left:4px;background:var(--slab);color:var(--off);border:1px solid var(--edge);">${p.category || 'tool'}</span>
      <h3 class="card-name">${p.name}</h3>
      <p class="card-desc">${(p.description || '').substring(0, 120)}${p.description?.length > 120 ? '...' : ''}</p>
      <div class="card-footer">
        <div>
          <div class="card-price">$${parseFloat(p.price || 0).toLocaleString()}</div>
          <div class="card-meta">${p.product_id || ''}</div>
        </div>
        <button class="btn btn-sm btn-primary" onclick="event.stopPropagation(); addToCart({id:${p.id}, name:'${(p.name||'').replace(/'/g,"\\'")}', price:${p.price}, product_id:'${p.product_id}'})">ACQUIRE</button>
      </div>
    </div>
  `;
}

async function renderProductDetail(id) {
  const root = document.getElementById('app-root');
  const data = await fetchAPI('/api/v1/products/' + id);

  if (!data.success) {
    // VULNERABLE: error message may contain Reflected XSS from server
    root.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠️</div><div class="empty-state-text">${data.error || 'Product not found'}</div></div>`;
    return;
  }

  const p = data.data || data.product;
  const specs = typeof p.specs === 'string' ? JSON.parse(p.specs || '{}') : (p.specs || {});

  // Fetch reviews
  const reviewData = await fetchAPI('/api/v1/reviews/' + id);
  const reviews = reviewData.reviews || [];

  root.innerHTML = `
    <div class="animate-in">
      <a href="#/" class="text-off text-sm" onclick="router.navigate('/')">&larr; BACK TO CATALOG</a>

      <div class="card mt-16">
        <div class="card-header">
          <div>
            <span class="card-tag ${p.tier === 'TIER-S' ? 'tier-s' : p.tier === 'TIER-A' ? 'tier-a' : 'tier-b'}">${p.tier}</span>
            <span class="card-tag" style="margin-left:4px;background:var(--slab);color:var(--off);border:1px solid var(--edge);">${p.category}</span>
          </div>
          <span class="text-muted text-xs">${p.product_id}</span>
        </div>
        <div class="card-body">
          <h1 class="section-title" style="font-size:28px;">${p.name}</h1>
          <p class="text-off mt-8" style="line-height:1.8;">${p.description}</p>

          <div class="stats-grid mt-24">
            ${Object.entries(specs).map(([k,v]) => `
              <div class="stat-card">
                <div class="stat-label">${k.replace(/_/g,' ').toUpperCase()}</div>
                <div class="stat-value" style="font-size:18px;color:var(--white);">${v}</div>
              </div>
            `).join('')}
          </div>

          <div class="flex-between mt-24" style="padding-top:20px;border-top:1px solid var(--edge);">
            <div class="card-price" style="font-size:36px;">$${parseFloat(p.price).toLocaleString()}</div>
            <button class="btn btn-primary" onclick="addToCart({id:${p.id}, name:'${(p.name||'').replace(/'/g,"\\'")}', price:${p.price}, product_id:'${p.product_id}'})">ACQUIRE ASSET</button>
          </div>
        </div>
      </div>

      <!-- Reviews -->
      <div class="card mt-24">
        <div class="card-header">
          <span class="text-red text-brutal" style="font-size:16px;">REVIEWS (${reviews.length})</span>
          ${state.user ? '<button class="btn btn-sm btn-secondary" onclick="showReviewForm(' + p.id + ')">WRITE REVIEW</button>' : ''}
        </div>
        <div class="card-body" id="reviews-container">
          ${reviews.length === 0 ? '<p class="text-muted text-sm">No reviews yet.</p>' : ''}
          ${reviews.map(r => `
            <div style="border-bottom:1px solid var(--edge);padding:16px 0;">
              <div class="flex-between">
                <span class="text-sm"><strong class="text-white">${r.username}</strong> <span class="text-off">— ${r.title || ''}</span></span>
                <span class="text-yellow text-sm">${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}</span>
              </div>
              <!-- VULNERABLE: Stored XSS — review comment rendered raw via innerHTML -->
              <p class="text-off text-sm mt-8">${r.comment}</p>
            </div>
          `).join('')}
        </div>
      </div>

      <div id="review-form-container"></div>
    </div>
  `;
}

function showReviewForm(productId) {
  document.getElementById('review-form-container').innerHTML = `
    <div class="card mt-16">
      <div class="card-body">
        <h3 class="text-brutal text-red" style="font-size:18px;">WRITE REVIEW</h3>
        <div class="form-group mt-16">
          <label class="form-label">RATING</label>
          <select id="review-rating" class="form-select">
            <option value="5">★★★★★</option><option value="4">★★★★☆</option><option value="3">★★★☆☆</option>
            <option value="2">★★☆☆☆</option><option value="1">★☆☆☆☆</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">TITLE</label>
          <input type="text" id="review-title" class="form-input" placeholder="Brief summary...">
        </div>
        <div class="form-group">
          <label class="form-label">REVIEW</label>
          <textarea id="review-comment" class="form-textarea" placeholder="Your experience..."></textarea>
        </div>
        <button class="btn btn-primary" onclick="submitReview(${productId})">SUBMIT REVIEW</button>
      </div>
    </div>
  `;
}

async function submitReview(productId) {
  const data = await fetchAPI('/api/v1/reviews', {
    method: 'POST',
    body: {
      productId: String(productId),
      rating: parseInt(document.getElementById('review-rating').value),
      title: document.getElementById('review-title').value,
      comment: document.getElementById('review-comment').value
    }
  });
  if (data.success) {
    showToast('Review submitted', 'success');
    renderProductDetail(productId);
  } else {
    showToast(data.error || 'Failed to submit review', 'error');
  }
}

function searchProducts() {
  const q = document.getElementById('catalog-search').value;
  router.navigate('/?search=' + encodeURIComponent(q));
}

function filterCategory(cat) {
  const search = document.getElementById('catalog-search')?.value || '';
  let path = '/';
  const params = [];
  if (search) params.push('search=' + encodeURIComponent(search));
  if (cat) params.push('category=' + encodeURIComponent(cat));
  if (params.length) path += '?' + params.join('&');
  router.navigate(path);
}
