// REST API v1 routes — JSON Injection, Mass Assignment, SQL Injection
const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

// GET /api/v1/products — SQL Injection
router.get('/products', (req, res) => {
  const search = req.query.search || '';
  const category = req.query.category || '';
  const minPrice = req.query.min_price || '';
  const maxPrice = req.query.max_price || '';

  let query = `SELECT * FROM products WHERE is_hidden = 0`;
  if (search) query += ` AND (name LIKE '%${search}%' OR description LIKE '%${search}%')`;
  if (category) query += ` AND category = '${category}'`;
  if (minPrice) query += ` AND price >= ${minPrice}`;
  if (maxPrice) query += ` AND price <= ${maxPrice}`;
  query += ` ORDER BY id DESC`;

  pool.query(query, (err, results) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    const products = results.map(p => ({
      ...p,
      specs: typeof p.specs === 'string' ? JSON.parse(p.specs) : p.specs
    }));
    res.json({ success: true, data: products, total: products.length });
  });
});

// GET /api/v1/products/:id
router.get('/products/:id', (req, res) => {
  const id = req.params.id;
  const query = /^\d+$/.test(id)
    ? `SELECT * FROM products WHERE id = ${id}`
    : `SELECT * FROM products WHERE product_id = '${id}'`;

  pool.query(query, (err, results) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    if (results.length === 0) return res.status(404).json({ success: false, error: 'Product not found' });
    const p = results[0];
    p.specs = typeof p.specs === 'string' ? JSON.parse(p.specs) : p.specs;
    res.json({ success: true, data: p });
  });
});

// PUT /api/v1/products/:id — JSON Injection / Mass Assignment
router.put('/products/:id', (req, res) => {
  if (!req.session?.userId) return res.status(401).json({ success: false, error: 'Auth required' });

  const id = req.params.id;
  const updates = req.body;

  // VULNERABLE: Mass Assignment — ALL fields from request body are accepted
  // Attacker can inject: {"price": 0, "is_hidden": 0, "seller_id": 1}
  // or even: {"name": "<script>alert(1)</script>"}
  const setClauses = Object.entries(updates)
    .map(([key, value]) => {
      if (typeof value === 'object') value = JSON.stringify(value);
      return `${key} = '${value}'`;
    })
    .join(', ');

  if (!setClauses) return res.status(400).json({ success: false, error: 'No fields to update' });

  const query = `UPDATE products SET ${setClauses} WHERE id = ${id}`;

  pool.query(query, (err) => {
    if (err) return res.status(500).json({ success: false, error: err.message });

    // Return updated product (reflects injected fields)
    pool.query(`SELECT * FROM products WHERE id = ${id}`, (err2, results) => {
      res.json({ success: true, message: 'Product updated', data: results?.[0] || {} });
    });
  });
});

// GET /api/v1/orders — SQL Injection in order_id
router.get('/orders', (req, res) => {
  if (!req.session?.userId) return res.status(401).json({ success: false, error: 'Auth required' });

  const userId = req.session.userId;
  const orderId = req.query.order_id || '';

  let query = `SELECT o.*, GROUP_CONCAT(p.name) as products 
               FROM orders o 
               LEFT JOIN order_items oi ON o.id = oi.order_id 
               LEFT JOIN products p ON oi.product_id = p.id 
               WHERE o.user_id = ${userId}`;

  // VULNERABLE: SQL Injection in order_id filter
  if (orderId) query += ` AND o.order_id = '${orderId}'`;

  query += ` GROUP BY o.id ORDER BY o.created_at DESC`;

  pool.query(query, (err, results) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.json({ success: true, data: results });
  });
});

// POST /api/v1/orders — Create order
router.post('/orders', (req, res) => {
  if (!req.session?.userId) return res.status(401).json({ success: false, error: 'Auth required' });

  const { items, payment_method, shipping_address } = req.body;
  if (!items || !items.length) return res.status(400).json({ success: false, error: 'Items required' });

  const orderId = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
  const total = items.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);

  const orderQuery = `INSERT INTO orders (order_id, user_id, total, status, payment_method, shipping_address) 
                      VALUES ('${orderId}', ${req.session.userId}, ${total}, 'pending', '${payment_method || 'XMR'}', '${shipping_address || ''}')`;

  pool.query(orderQuery, (err, result) => {
    if (err) return res.status(500).json({ success: false, error: err.message });

    const orderDbId = result.insertId;
    const itemInserts = items.map(item =>
      `(${orderDbId}, ${item.product_id}, ${item.quantity || 1}, ${item.price})`
    ).join(', ');

    pool.query(`INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ${itemInserts}`, () => {});

    res.json({ success: true, orderId, total, message: 'Order placed — escrow initiated' });
  });
});

// GET /api/v1/users/:id — Information disclosure (no auth check on sensitive fields)
router.get('/users/:id', (req, res) => {
  const id = req.params.id;

  // VULNERABLE: No authorization check — any user can access any user's data
  // VULNERABLE: Exposes private_key and other sensitive fields
  const query = `SELECT id, username, email, role, nickname, bio, address, private_key, balance, is_verified, created_at FROM users WHERE id = ${id}`;

  pool.query(query, (err, results) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    if (results.length === 0) return res.status(404).json({ success: false, error: 'User not found' });
    res.json({ success: true, data: results[0] });
  });
});

// PATCH /api/v1/users/:id — JSON Injection / Role Escalation
router.patch('/users/:id', (req, res) => {
  if (!req.session?.userId) return res.status(401).json({ success: false, error: 'Auth required' });

  const id = req.params.id;
  const updates = req.body;

  // VULNERABLE: Mass assignment allows setting role field
  // Payload: {"role": "admin"} or {"is_verified": 1, "balance": 999999}
  const setClauses = Object.keys(updates)
    .map(k => `${k} = '${updates[k]}'`)
    .join(', ');

  if (!setClauses) return res.status(400).json({ success: false, error: 'No updates' });

  // VULNERABLE: No check that user is updating their own profile
  const query = `UPDATE users SET ${setClauses} WHERE id = ${id}`;

  pool.query(query, (err) => {
    if (err) return res.status(500).json({ success: false, error: err.message });

    // Update session if user updated themselves
    if (parseInt(id) === req.session.userId && updates.role) {
      req.session.role = updates.role;
    }

    pool.query(`SELECT id, username, email, role, nickname, balance, is_verified FROM users WHERE id = ${id}`, (err2, results) => {
      res.json({ success: true, message: 'User updated', data: results?.[0] || {} });
    });
  });
});

module.exports = router;
