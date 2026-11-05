// Product routes — catalog, search, product details
// The backbone of the marketplace
const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

// GET /products — SQL Injection in search, category, sort
router.get('/products', (req, res) => {
  const search = req.query.search || '';
  const category = req.query.category || '';
  const sort = req.query.sort || 'id';
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const offset = (page - 1) * limit;
  const debug = req.query.debug === '1';

  // VULNERABLE: SQL Injection via string concatenation in WHERE and ORDER BY
  // Multiple injection points: search, category, sort
  let query = `SELECT * FROM products WHERE is_hidden = 0`;

  if (search) {
    // VULNERABLE: search parameter directly interpolated
    query += ` AND (name LIKE '%${search}%' OR description LIKE '%${search}%')`;
  }

  if (category) {
    // VULNERABLE: category parameter directly interpolated
    query += ` AND category = '${category}'`;
  }

  // VULNERABLE: ORDER BY injection — sort parameter not validated
  query += ` ORDER BY ${sort}`;
  query += ` LIMIT ${limit} OFFSET ${offset}`;

  pool.query(query, (err, results) => {
    if (err) {
      console.error('[PRODUCTS] Query error:', err.message);
      // VULNERABLE: Full error message exposure
      if (debug) {
        return res.status(500).json({
          success: false,
          error: err.message,
          query: query,
          sqlState: err.sqlState,
          code: err.code
        });
      }
      // Even without debug, error-based SQLi leaks info
      return res.status(500).json({
        success: false,
        error: 'Query failed: ' + err.message
      });
    }

    // Parse specs JSON for each product
    const products = results.map(p => ({
      ...p,
      specs: typeof p.specs === 'string' ? JSON.parse(p.specs) : p.specs
    }));

    res.json({
      success: true,
      count: products.length,
      products,
      // VULNERABLE: Reflects search term back — can be used for XSS
      // if this JSON is rendered as HTML somewhere
      meta: {
        search: search,
        category: category,
        sort: sort,
        page,
        limit
      }
    });
  });
});

// GET /products/:id — Reflected XSS in error message
router.get('/products/:id', (req, res) => {
  const productId = req.params.id;

  // Try numeric ID first, then product_id string
  let query;
  if (/^\d+$/.test(productId)) {
    query = `SELECT * FROM products WHERE id = ${productId}`;
  } else {
    // VULNERABLE: product_id interpolated directly
    query = `SELECT * FROM products WHERE product_id = '${productId}'`;
  }

  pool.query(query, (err, results) => {
    if (err) {
      return res.status(500).json({
        success: false,
        error: err.message,
        query: req.query.debug === '1' ? query : undefined
      });
    }

    if (results.length === 0) {
      // VULNERABLE: Reflected XSS — product ID echoed without escaping
      // An attacker can craft: /products/<script>alert(1)</script>
      return res.status(404).send(`
        <html>
        <head><title>HellCorp — Not Found</title></head>
        <body style="background:#050505;color:#f0ece4;font-family:'Courier New',monospace;padding:60px;text-align:center;">
          <h1 style="color:#ff1a1a;font-size:48px;">404</h1>
          <p style="color:#a09a90;font-size:14px;">Product <strong>${productId}</strong> not found in catalog.</p>
          <p style="color:#333;font-size:11px;">If you believe this is an error, contact support.</p>
          <a href="/" style="color:#ff1a1a;">← Return to catalog</a>
        </body>
        </html>
      `);
    }

    const product = results[0];
    product.specs = typeof product.specs === 'string' ? JSON.parse(product.specs) : product.specs;

    res.json({ success: true, product });
  });
});

// POST /products/:id/review — Stored XSS via MongoDB
router.post('/products/:id/review', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ success: false, error: 'Login required' });
  }

  try {
    const { getDb } = require('../config/mongodb');
    const db = getDb();

    // VULNERABLE: Review content stored without any sanitization
    // When rendered in the frontend, it will execute as HTML/JS
    const review = {
      productId: req.params.id,
      userId: req.session.userId,
      username: req.session.username,
      rating: parseInt(req.body.rating) || 5,
      comment: req.body.comment,  // VULNERABLE: raw HTML/JS stored
      title: req.body.title,      // VULNERABLE: raw input
      createdAt: new Date()
    };

    await db.collection('reviews').insertOne(review);

    res.json({ success: true, message: 'Review submitted', review });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /products/:id/reviews — Returns raw reviews (Stored XSS renders here)
router.get('/products/:id/reviews', async (req, res) => {
  try {
    const { getDb } = require('../config/mongodb');
    const db = getDb();

    // VULNERABLE: If query params are passed as MongoDB operators
    const filter = { productId: req.params.id };

    // VULNERABLE: Additional filter params passed directly to MongoDB
    if (req.query.username) {
      filter.username = req.query.username; // NoSQL injection if object passed
    }
    if (req.query.rating) {
      filter.rating = req.query.rating; // NoSQL injection via $gt, $lt
    }

    const reviews = await db.collection('reviews')
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();

    res.json({ success: true, reviews });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
