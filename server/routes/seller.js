// Seller dashboard routes
// Features: inventory management, ping tool, template editor, profile, file upload
const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { exec } = require('child_process');
const { renderTemplate, previewSellerTemplate } = require('../services/template-engine');
const multer = require('multer');
const path = require('path');

const upload = multer({ dest: path.join(__dirname, '../../uploads/') });

// Middleware: seller or admin check
function sellerCheck(req, res, next) {
  if (req.session && (req.session.role === 'seller' || req.session.role === 'admin')) {
    return next();
  }
  return res.status(403).json({ success: false, error: 'Seller access required' });
}

// POST /seller/ping — OS Command Injection
router.post('/seller/ping', sellerCheck, (req, res) => {
  const host = req.body.host || '';

  if (!host) {
    return res.status(400).json({ success: false, error: 'Hostname or IP required' });
  }

  // VULNERABLE: OS Command Injection — user input directly in shell command
  // Payload: 127.0.0.1; cat /etc/passwd
  // Payload: 127.0.0.1 && whoami
  // Payload: `id`
  const isWindows = process.platform === 'win32';
  const cmd = isWindows ? `ping -n 4 ${host}` : `ping -c 4 ${host}`;

  console.log(`[SELLER] Executing ping: ${cmd}`);

  exec(cmd, { timeout: 15000 }, (err, stdout, stderr) => {
    res.json({
      success: !err,
      command: cmd,
      output: stdout || '',
      error: stderr || (err ? err.message : ''),
      // VULNERABLE: Shows the exact command that was executed
      executedCommand: cmd
    });
  });
});

// POST /seller/upload-sample — OS Command Injection via filename
router.post('/seller/upload-sample', sellerCheck, upload.single('sample'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No file uploaded' });
  }

  // VULNERABLE: Original filename used directly in shell command
  // Payload filename: test.bin; cat /etc/passwd
  const originalName = req.file.originalname;
  const filePath = req.file.path;

  // VULNERABLE: filename injected into command string
  const cmd = `strings "${originalName}" | head -50`;

  console.log(`[SELLER] Analyzing file: ${cmd}`);

  exec(cmd, { timeout: 10000, cwd: path.dirname(filePath) }, (err, stdout, stderr) => {
    res.json({
      success: true,
      filename: originalName,
      analysis: {
        command: cmd,
        strings: stdout || 'No readable strings found',
        error: stderr || ''
      },
      file: {
        size: req.file.size,
        mimetype: req.file.mimetype,
        path: filePath // VULNERABLE: Internal path disclosure
      }
    });
  });
});

// POST /seller/template — SSTI (Server-Side Template Injection)
router.post('/seller/template', sellerCheck, (req, res) => {
  const { template, name } = req.body;

  if (!template) {
    return res.status(400).json({ success: false, error: 'Template content required' });
  }

  // VULNERABLE: SSTI — user-supplied template string rendered by Nunjucks
  // Payload: {{ range.constructor("return global.process.mainModule.require('child_process').execSync('whoami').toString()")() }}
  const result = previewSellerTemplate(template, {
    buyer_name: 'PreviewBuyer',
    product_name: 'Preview Product',
    order_id: 'ORD-PREVIEW-001'
  });

  // Save template if name provided
  if (name && req.session.userId) {
    const saveQuery = `INSERT INTO email_templates (seller_id, template_name, template_content) 
                       VALUES (${req.session.userId}, '${name}', '${template.replace(/'/g, "''")}')
                       ON DUPLICATE KEY UPDATE template_content = '${template.replace(/'/g, "''")}'`;
    pool.query(saveQuery, () => {});
  }

  res.json({
    success: true,
    preview: result,
    message: result.success ? 'Template rendered successfully' : `Template error: ${result.error}`
  });
});

// GET /seller/template/preview — Preview saved template
router.get('/seller/template/preview', sellerCheck, (req, res) => {
  const templateId = req.query.id;
  if (!templateId) {
    return res.status(400).json({ success: false, error: 'Template ID required' });
  }

  pool.query(`SELECT * FROM email_templates WHERE id = ${templateId}`, (err, results) => {
    if (err || results.length === 0) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }

    const result = previewSellerTemplate(results[0].template_content, {});
    res.json({ success: true, template: results[0], preview: result });
  });
});

// PUT /seller/profile — Stored XSS in bio field
router.put('/seller/profile', sellerCheck, (req, res) => {
  const { bio, nickname, address } = req.body;
  const userId = req.session.userId;

  // VULNERABLE: Stored XSS — bio field stored without sanitization
  // When other users view the seller profile, the bio renders as raw HTML
  const updates = [];
  if (bio !== undefined) updates.push(`bio = '${bio}'`);
  if (nickname !== undefined) updates.push(`nickname = '${nickname}'`);
  if (address !== undefined) updates.push(`address = '${address}'`);

  if (updates.length === 0) {
    return res.status(400).json({ success: false, error: 'No fields to update' });
  }

  // VULNERABLE: SQL Injection in UPDATE via string concat
  const query = `UPDATE users SET ${updates.join(', ')} WHERE id = ${userId}`;

  pool.query(query, (err) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.json({ success: true, message: 'Profile updated' });
  });
});

// GET /seller/sales — SQL Injection in filter/date params
router.get('/seller/sales', sellerCheck, (req, res) => {
  const sellerId = req.session.userId;
  const filter = req.query.filter || '';
  const dateFrom = req.query.from || '';
  const dateTo = req.query.to || '';

  // VULNERABLE: SQL Injection in date and filter parameters
  let query = `SELECT o.*, oi.product_id, oi.quantity, oi.price as item_price, p.name as product_name, u.username as buyer
               FROM orders o
               JOIN order_items oi ON o.id = oi.order_id
               JOIN products p ON oi.product_id = p.id
               JOIN users u ON o.user_id = u.id
               WHERE p.seller_id = ${sellerId}`;

  if (filter) query += ` AND (p.name LIKE '%${filter}%' OR o.order_id LIKE '%${filter}%')`;
  if (dateFrom) query += ` AND o.created_at >= '${dateFrom}'`;
  if (dateTo) query += ` AND o.created_at <= '${dateTo}'`;

  query += ` ORDER BY o.created_at DESC`;

  pool.query(query, (err, results) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.json({ success: true, sales: results });
  });
});

// POST /seller/note — SQL Injection with stacked queries
router.post('/seller/note', sellerCheck, (req, res) => {
  const { product_id, note } = req.body;
  const sellerId = req.session.userId;

  // VULNERABLE: Stacked queries — semicolon allows executing additional statements
  // Payload: note'); DROP TABLE seller_notes;--
  // Payload: note'); UPDATE products SET price = 0 WHERE seller_id = 2;--
  const query = `INSERT INTO seller_notes (seller_id, product_id, note) VALUES (${sellerId}, ${product_id}, '${note}')`;

  pool.query(query, (err, result) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.json({ success: true, message: 'Note saved', id: result.insertId });
  });
});

// GET /seller/inventory — Get seller's products
router.get('/seller/inventory', sellerCheck, (req, res) => {
  const sellerId = req.session.userId;
  pool.query(`SELECT * FROM products WHERE seller_id = ${sellerId} ORDER BY created_at DESC`, (err, results) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.json({ success: true, products: results });
  });
});

// GET /seller/templates — Get seller's email templates
router.get('/seller/templates', sellerCheck, (req, res) => {
  const sellerId = req.session.userId;
  pool.query(`SELECT * FROM email_templates WHERE seller_id = ${sellerId}`, (err, results) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.json({ success: true, templates: results });
  });
});

module.exports = router;
