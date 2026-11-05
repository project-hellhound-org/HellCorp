// CSV Export routes — CSV Injection (formula injection)
const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

// GET /export/orders.csv — CSV Injection
router.get('/orders.csv', (req, res) => {
  if (!req.session?.userId) return res.status(401).send('Authentication required');

  const userId = req.session.userId;
  const isAdmin = req.session.role === 'admin';

  let query = `SELECT o.order_id, o.created_at, o.total, o.status, o.payment_method,
                      u.username as buyer, p.name as product, oi.quantity, oi.price
               FROM orders o
               JOIN order_items oi ON o.id = oi.order_id
               JOIN products p ON oi.product_id = p.id
               JOIN users u ON o.user_id = u.id`;

  if (!isAdmin) {
    // Sellers see their own sales; buyers see their own orders
    if (req.session.role === 'seller') {
      query += ` WHERE p.seller_id = ${userId}`;
    } else {
      query += ` WHERE o.user_id = ${userId}`;
    }
  }

  query += ` ORDER BY o.created_at DESC`;

  pool.query(query, (err, results) => {
    if (err) return res.status(500).send('Export failed: ' + err.message);

    // Build CSV
    // VULNERABLE: CSV Injection — No escaping of =, +, -, @ characters
    // If a username or product name starts with =, +, -, @, it becomes a formula
    // when opened in Excel/LibreOffice
    // Example: username "=CMD|'/C calc'!A0" would execute calc on victim machine
    let csv = 'Order ID,Date,Buyer,Product,Quantity,Price,Total,Status,Payment\n';

    results.forEach(row => {
      // VULNERABLE: Raw field values written to CSV without escaping
      csv += `${row.order_id},${row.created_at},${row.buyer},${row.product},${row.quantity},${row.price},${row.total},${row.status},${row.payment_method}\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="hellcorp_orders.csv"');
    res.send(csv);
  });
});

// GET /export/transactions.csv — CSV Injection (admin export)
router.get('/transactions.csv', (req, res) => {
  if (req.session?.role !== 'admin') return res.status(403).send('Admin access required');

  pool.query(`SELECT o.*, u.username, u.email, u.nickname FROM orders o JOIN users u ON o.user_id = u.id ORDER BY o.created_at DESC`, (err, results) => {
    if (err) return res.status(500).send('Export failed');

    // VULNERABLE: nickname field may contain formula payload
    let csv = 'Order ID,Date,Username,Nickname,Email,Total,Status,Payment,Address\n';
    results.forEach(row => {
      csv += `${row.order_id},${row.created_at},${row.username},${row.nickname || ''},${row.email || ''},${row.total},${row.status},${row.payment_method},${row.shipping_address || ''}\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="hellcorp_transactions.csv"');
    res.send(csv);
  });
});

// GET /export/users.csv — Admin user export (CSV Injection via bio/nickname)
router.get('/users.csv', (req, res) => {
  if (req.session?.role !== 'admin') return res.status(403).send('Admin access required');

  pool.query('SELECT id, username, email, role, nickname, bio, balance, is_verified, created_at FROM users', (err, results) => {
    if (err) return res.status(500).send('Export failed');

    let csv = 'ID,Username,Email,Role,Nickname,Bio,Balance,Verified,Created\n';
    results.forEach(row => {
      csv += `${row.id},${row.username},${row.email || ''},${row.role},${row.nickname || ''},${(row.bio || '').replace(/\n/g, ' ')},${row.balance},${row.is_verified},${row.created_at}\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="hellcorp_users.csv"');
    res.send(csv);
  });
});

module.exports = router;
