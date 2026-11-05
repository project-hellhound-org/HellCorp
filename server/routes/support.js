// Support ticket routes — Blind XSS surface
const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

function authCheck(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }
  next();
}

// POST /support/ticket — Blind XSS (rendered in admin panel)
router.post('/support/ticket', authCheck, (req, res) => {
  const { subject, description } = req.body;

  if (!description) {
    return res.status(400).json({ success: false, error: 'Description required' });
  }

  // VULNERABLE: Blind XSS — description stored raw, rendered in admin /admin/reports
  // Admin views this in their panel and XSS executes in admin context
  const query = `INSERT INTO support_tickets (user_id, subject, description) 
                 VALUES (${req.session.userId}, '${(subject || 'Support Request').replace(/'/g, "\\'")}', '${description.replace(/'/g, "\\'")}')`;

  pool.query(query, (err, result) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.json({ success: true, message: 'Ticket submitted — our team will respond within 24h', ticketId: result.insertId });
  });
});

// POST /support/report — Blind XSS (viewed by admin)
router.post('/support/report', authCheck, (req, res) => {
  const { product_id, reason } = req.body;

  // VULNERABLE: Blind XSS in reason field
  const query = `INSERT INTO reports (reporter_id, product_id, reason) 
                 VALUES (${req.session.userId}, ${parseInt(product_id) || 0}, '${(reason || '').replace(/'/g, "\\'")}')`;

  pool.query(query, (err, result) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.json({ success: true, message: 'Report submitted for review' });
  });
});

// POST /support/feedback — Blind XSS
router.post('/support/feedback', (req, res) => {
  const { message } = req.body;
  const userId = req.session?.userId || null;

  // VULNERABLE: Blind XSS in feedback message
  const query = `INSERT INTO feedback (user_id, message) 
                 VALUES (${userId}, '${(message || '').replace(/'/g, "\\'")}')`;

  pool.query(query, (err) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.json({ success: true, message: 'Thank you for your feedback' });
  });
});

// GET /support/tickets — List user's own tickets
router.get('/support/tickets', authCheck, (req, res) => {
  pool.query(
    `SELECT * FROM support_tickets WHERE user_id = ${req.session.userId} ORDER BY created_at DESC`,
    (err, results) => {
      if (err) return res.status(500).json({ success: false, error: err.message });
      res.json({ success: true, tickets: results });
    }
  );
});

module.exports = router;
