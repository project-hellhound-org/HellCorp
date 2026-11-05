// Admin panel routes
// Access control: check session role (but it can be bypassed via SQLi/NoSQLi/JSON injection)
const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { evaluateExpression, evaluateFormula } = require('../services/el-evaluator');

// Middleware: soft admin check (easily bypassable)
function adminCheck(req, res, next) {
  if (req.session && req.session.role === 'admin') {
    return next();
  }
  // Also accept admin API key in header (another bypass vector)
  if (req.headers['x-api-key'] === process.env.ADMIN_API_KEY) {
    return next();
  }
  return res.status(403).json({ success: false, error: 'Admin access required' });
}

// GET /admin/users — SQL Injection in search, stacked queries
router.get('/admin/users', adminCheck, (req, res) => {
  const search = req.query.search || '';
  const role = req.query.role || '';

  // VULNERABLE: SQL Injection with stacked queries enabled
  let query = `SELECT id, username, email, role, nickname, balance, is_verified, created_at FROM users WHERE 1=1`;

  if (search) {
    query += ` AND (username LIKE '%${search}%' OR email LIKE '%${search}%' OR nickname LIKE '%${search}%')`;
  }
  if (role) {
    query += ` AND role = '${role}'`;
  }

  query += ` ORDER BY id DESC`;

  pool.query(query, (err, results) => {
    if (err) {
      return res.status(500).json({
        success: false,
        error: err.message,
        query: req.query.debug === '1' ? query : undefined
      });
    }
    res.json({ success: true, users: results });
  });
});

// GET /admin/user/:id — Second-order SQL Injection via nickname
router.get('/admin/user/:id', adminCheck, (req, res) => {
  const userId = req.params.id;

  pool.query(`SELECT * FROM users WHERE id = ${userId}`, (err, results) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    if (results.length === 0) return res.status(404).json({ success: false, error: 'User not found' });

    const user = results[0];
    // Remove password from response
    delete user.password;

    // VULNERABLE: Second-order SQL Injection
    // The user's nickname (set during registration) is used unsanitized in another query
    // If nickname contains SQL injection payload, it executes here
    const logQuery = `SELECT * FROM admin_logs WHERE details LIKE '%${user.nickname}%' ORDER BY created_at DESC LIMIT 10`;

    pool.query(logQuery, (err2, logs) => {
      res.json({
        success: true,
        user,
        recentLogs: err2 ? [] : logs,
        logError: err2 ? err2.message : undefined
      });
    });
  });
});

// GET /admin/logs — Blind XSS surface (renders User-Agent from MongoDB)
router.get('/admin/logs', adminCheck, async (req, res) => {
  try {
    const { getDb } = require('../config/mongodb');
    const db = getDb();

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;

    const filter = {};
    if (req.query.action) filter.action = req.query.action;
    if (req.query.ip) filter.ip = req.query.ip;

    const logs = await db.collection('audit_logs')
      .find(filter)
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray();

    // VULNERABLE: Logs contain raw User-Agent strings
    // When admin views these in the panel, they render as HTML (Blind XSS)
    res.json({ success: true, logs, page, limit });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /admin/announcement — Stored XSS
router.post('/admin/announcement', adminCheck, (req, res) => {
  const { title, content } = req.body;

  // VULNERABLE: Stored XSS — content saved without sanitization
  // Rendered on homepage for all users
  const query = `INSERT INTO announcements (admin_id, title, content) VALUES (${req.session.userId}, '${title}', '${content}')`;

  pool.query(query, (err, result) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.json({ success: true, message: 'Announcement published', id: result.insertId });
  });
});

// GET /admin/announcements
router.get('/admin/announcements', (req, res) => {
  pool.query('SELECT * FROM announcements ORDER BY created_at DESC', (err, results) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.json({ success: true, announcements: results });
  });
});

// POST /admin/discount — Code Injection via eval()
router.post('/admin/discount', adminCheck, (req, res) => {
  const { name, formula, price, quantity } = req.body;

  if (!formula) {
    return res.status(400).json({ success: false, error: 'Formula required' });
  }

  // VULNERABLE: Code Injection — formula is passed to eval()
  // Example payload: require('child_process').execSync('whoami').toString()
  const result = evaluateFormula(formula, {
    price: parseFloat(price) || 100,
    quantity: parseInt(quantity) || 1
  });

  // Also save the rule to the database
  if (name) {
    const saveQuery = `INSERT INTO discount_rules (name, formula, created_by) VALUES ('${name}', '${formula}', ${req.session.userId})`;
    pool.query(saveQuery, () => {});
  }

  res.json({
    success: true,
    formula,
    testResult: result,
    message: result.success ? `Discount calculated: ${result.result}` : `Error: ${result.error}`
  });
});

// POST /admin/config — JSON Injection / Mass Assignment
router.post('/admin/config', adminCheck, async (req, res) => {
  try {
    const { getDb } = require('../config/mongodb');
    const db = getDb();

    // VULNERABLE: Mass assignment — entire request body is merged into config
    // Attacker can inject arbitrary keys like: {"admin_mode": true, "debug": true}
    const configUpdate = req.body;

    // No whitelist of allowed fields
    for (const [key, value] of Object.entries(configUpdate)) {
      await db.collection('site_config').updateOne(
        { key },
        { $set: { key, value, updatedAt: new Date(), updatedBy: req.session.username } },
        { upsert: true }
      );
    }

    // Return the full config (information disclosure)
    const config = await db.collection('site_config').find({}).toArray();

    res.json({
      success: true,
      message: 'Configuration updated',
      config
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /admin/el-eval — Expression Language Injection
router.post('/admin/el-eval', adminCheck, (req, res) => {
  const { expression } = req.body;

  if (!expression) {
    return res.status(400).json({ success: false, error: 'Expression required' });
  }

  // VULNERABLE: EL Injection — arbitrary expression evaluation
  // SpEL-like: T(java.lang.Runtime).getRuntime().exec('whoami')
  // Node.js: require('child_process').execSync('whoami').toString()
  // Also: process.env, require('fs').readFileSync('/etc/passwd','utf8')
  const result = evaluateExpression(expression);

  res.json({
    success: true,
    expression,
    ...result
  });
});

// GET /admin/reports — Blind XSS (renders ticket descriptions)
router.get('/admin/reports', adminCheck, (req, res) => {
  const query = `
    SELECT t.*, u.username as reporter 
    FROM support_tickets t 
    LEFT JOIN users u ON t.user_id = u.id 
    ORDER BY t.created_at DESC
  `;

  pool.query(query, (err, tickets) => {
    if (err) return res.status(500).json({ success: false, error: err.message });

    // Also get reports
    pool.query(`SELECT r.*, u.username as reporter FROM reports r LEFT JOIN users u ON r.reporter_id = u.id ORDER BY r.created_at DESC`, (err2, reports) => {
      // Also get feedback
      pool.query(`SELECT f.*, u.username as user FROM feedback f LEFT JOIN users u ON f.user_id = u.id ORDER BY f.created_at DESC`, (err3, feedback) => {
        res.json({
          success: true,
          tickets: tickets || [],
          reports: err2 ? [] : reports,
          feedback: err3 ? [] : feedback
        });
      });
    });
  });
});

// GET /admin/transactions — SQL Injection in filter
router.get('/admin/transactions', adminCheck, (req, res) => {
  const filter = req.query.filter || '';
  const status = req.query.status || '';

  // VULNERABLE: SQL Injection
  let query = `SELECT o.*, u.username FROM orders o LEFT JOIN users u ON o.user_id = u.id WHERE 1=1`;
  if (filter) query += ` AND (o.order_id LIKE '%${filter}%' OR u.username LIKE '%${filter}%')`;
  if (status) query += ` AND o.status = '${status}'`;
  query += ` ORDER BY o.created_at DESC`;

  pool.query(query, (err, results) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.json({ success: true, transactions: results });
  });
});

module.exports = router;
