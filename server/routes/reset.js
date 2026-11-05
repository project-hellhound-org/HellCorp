// Password reset & Contact routes — Host Header Injection, SMTP Injection
const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const { sendResetEmail, sendContactEmail } = require('../services/email');

// POST /reset-password — Host Header Injection + SMTP Injection
router.post('/reset-password', (req, res) => {
  const email = req.body.email;

  if (!email) {
    return res.status(400).json({ success: false, error: 'Email required' });
  }

  // Look up user by email
  pool.query(`SELECT * FROM users WHERE email = '${email}'`, (err, results) => {
    if (err) return res.status(500).json({ success: false, error: err.message });

    // Always return success to prevent email enumeration... but actually we leak info anyway
    const token = uuidv4();

    if (results.length > 0) {
      const user = results[0];

      // Store reset token
      pool.query(
        `INSERT INTO password_resets (user_id, token, email) VALUES (${user.id}, '${token}', '${email}')`,
        () => {}
      );

      // VULNERABLE: Host Header Injection
      // The reset link is built using the Host header from the request
      // Attacker sends: Host: evil.com → link becomes http://evil.com/reset?token=...
      const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';

      // VULNERABLE: SMTP Injection via email field
      // If email contains \r\n, additional headers can be injected
      sendResetEmail(email, token, host).then(result => {
        res.json({
          success: true,
          message: 'If an account exists with that email, a reset link has been sent.',
          // VULNERABLE: Leaks debug info
          debug: req.query.debug === '1' ? {
            token,
            link: `http://${host}/reset?token=${token}`,
            emailResult: result
          } : undefined
        });
      });
    } else {
      // Different response timing reveals whether email exists
      // (processing time differs)
      res.json({
        success: true,
        message: 'If an account exists with that email, a reset link has been sent.'
      });
    }
  });
});

// GET /reset — Show reset form (with token from email link)
router.get('/reset', (req, res) => {
  const token = req.query.token;

  if (!token) {
    return res.status(400).send(`
      <html><body style="background:#050505;color:#f0ece4;font-family:monospace;padding:60px;text-align:center;">
        <h1 style="color:#ff1a1a;">Invalid Reset Link</h1>
        <p>No token provided.</p>
      </body></html>
    `);
  }

  // Verify token exists
  pool.query(`SELECT * FROM password_resets WHERE token = '${token}' AND used = 0`, (err, results) => {
    if (err || results.length === 0) {
      return res.status(400).send(`
        <html><body style="background:#050505;color:#f0ece4;font-family:monospace;padding:60px;text-align:center;">
          <h1 style="color:#ff1a1a;">Invalid or Expired Token</h1>
          <p>This reset link is no longer valid.</p>
        </body></html>
      `);
    }

    res.send(`
      <html><body style="background:#050505;color:#f0ece4;font-family:'DM Mono',monospace;padding:60px;max-width:400px;margin:0 auto;">
        <h1 style="color:#ff1a1a;font-family:'Bebas Neue',sans-serif;font-size:36px;">RESET PASSWORD</h1>
        <form action="/reset/confirm" method="POST">
          <input type="hidden" name="token" value="${token}">
          <div style="margin-bottom:16px;">
            <label style="font-size:10px;letter-spacing:.2em;color:#a09a90;">NEW PASSWORD</label>
            <input type="password" name="password" style="width:100%;background:#111;border:1px solid #1a1a1a;color:#f0ece4;padding:12px;font-family:inherit;margin-top:6px;" required>
          </div>
          <button type="submit" style="width:100%;background:#ff1a1a;color:#000;border:none;padding:14px;font-family:'Bebas Neue',sans-serif;font-size:18px;cursor:pointer;">SET NEW PASSWORD</button>
        </form>
      </body></html>
    `);
  });
});

// POST /reset/confirm — Process password reset
router.post('/reset/confirm', (req, res) => {
  const { token, password } = req.body;
  const bcrypt = require('bcryptjs');

  pool.query(`SELECT * FROM password_resets WHERE token = '${token}' AND used = 0`, (err, results) => {
    if (err || results.length === 0) {
      return res.status(400).json({ success: false, error: 'Invalid token' });
    }

    const reset = results[0];
    const hash = bcrypt.hashSync(password, 10);

    pool.query(`UPDATE users SET password = '${hash}' WHERE id = ${reset.user_id}`, () => {});
    pool.query(`UPDATE password_resets SET used = 1 WHERE id = ${reset.id}`, () => {});

    res.json({ success: true, message: 'Password updated successfully' });
  });
});

// POST /contact-seller — SMTP Injection in subject and message
router.post('/contact-seller', (req, res) => {
  const { seller_id, subject, message, from_email } = req.body;

  if (!seller_id || !message) {
    return res.status(400).json({ success: false, error: 'Seller ID and message required' });
  }

  // Get seller email
  pool.query(`SELECT email FROM users WHERE id = ${seller_id}`, (err, results) => {
    if (err || results.length === 0) {
      return res.status(404).json({ success: false, error: 'Seller not found' });
    }

    const sellerEmail = results[0].email;
    const senderEmail = from_email || req.session?.email || 'anonymous@hellcorp.onion';

    // VULNERABLE: SMTP Injection — subject and from_email allow \r\n injection
    sendContactEmail(senderEmail, subject || 'Message from buyer', message, sellerEmail).then(result => {
      res.json({ success: true, message: 'Message sent to seller', result });
    });
  });
});

module.exports = router;
