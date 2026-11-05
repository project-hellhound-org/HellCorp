// Private messaging routes — Stored XSS, Mutation XSS surface
const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

function authCheck(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }
  next();
}

// GET /messages/inbox
router.get('/messages/inbox', authCheck, (req, res) => {
  const userId = req.session.userId;
  const query = `SELECT m.*, u.username as sender_name, u.nickname as sender_nickname
                 FROM messages m 
                 LEFT JOIN users u ON m.sender_id = u.id 
                 WHERE m.recipient_id = ${userId} 
                 ORDER BY m.created_at DESC`;

  pool.query(query, (err, results) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    // VULNERABLE: message body returned raw — Stored XSS renders in frontend
    res.json({ success: true, messages: results });
  });
});

// GET /messages/sent
router.get('/messages/sent', authCheck, (req, res) => {
  const userId = req.session.userId;
  pool.query(
    `SELECT m.*, u.username as recipient_name FROM messages m LEFT JOIN users u ON m.recipient_id = u.id WHERE m.sender_id = ${userId} ORDER BY m.created_at DESC`,
    (err, results) => {
      if (err) return res.status(500).json({ success: false, error: err.message });
      res.json({ success: true, messages: results });
    }
  );
});

// GET /messages/:id
router.get('/messages/:id', authCheck, (req, res) => {
  const msgId = req.params.id;
  const userId = req.session.userId;

  // VULNERABLE: SQL Injection in message ID
  const query = `SELECT m.*, u.username as sender_name, u.nickname as sender_nickname 
                 FROM messages m LEFT JOIN users u ON m.sender_id = u.id 
                 WHERE m.id = ${msgId} AND (m.sender_id = ${userId} OR m.recipient_id = ${userId})`;

  pool.query(query, (err, results) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    if (results.length === 0) return res.status(404).json({ success: false, error: 'Message not found' });

    // Mark as read
    pool.query(`UPDATE messages SET is_read = 1 WHERE id = ${msgId}`, () => {});

    // VULNERABLE: Raw body returned — Stored XSS + Mutation XSS when rendered with innerHTML
    res.json({ success: true, message: results[0] });
  });
});

// POST /messages/send — Stored XSS via message body
router.post('/messages/send', authCheck, (req, res) => {
  const { recipient, subject, body } = req.body;
  const senderId = req.session.userId;

  if (!recipient || !body) {
    return res.status(400).json({ success: false, error: 'Recipient and message body required' });
  }

  // Look up recipient
  pool.query(`SELECT id FROM users WHERE username = '${recipient}'`, (err, results) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    if (results.length === 0) return res.status(404).json({ success: false, error: 'Recipient not found' });

    const recipientId = results[0].id;

    // VULNERABLE: Stored XSS — message body stored without any sanitization
    // When recipient opens inbox, body is rendered with innerHTML
    const insertQuery = `INSERT INTO messages (sender_id, recipient_id, subject, body) 
                         VALUES (${senderId}, ${recipientId}, '${subject || 'No Subject'}', '${body.replace(/'/g, "\\'")}')`;

    pool.query(insertQuery, (err2, result) => {
      if (err2) return res.status(500).json({ success: false, error: err2.message });
      res.json({ success: true, message: 'Message sent', id: result.insertId });
    });
  });
});

// DELETE /messages/:id
router.delete('/messages/:id', authCheck, (req, res) => {
  const msgId = req.params.id;
  const userId = req.session.userId;

  pool.query(`DELETE FROM messages WHERE id = ${msgId} AND (sender_id = ${userId} OR recipient_id = ${userId})`, (err) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.json({ success: true, message: 'Message deleted' });
  });
});

// GET /messages/users — List users for recipient selector
router.get('/messages/users', authCheck, (req, res) => {
  pool.query('SELECT id, username, nickname, role FROM users ORDER BY username', (err, results) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.json({ success: true, users: results });
  });
});

module.exports = router;
