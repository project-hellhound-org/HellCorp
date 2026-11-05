// Authentication routes — Login, Register, Logout
// TODO: add rate limiting to prevent brute force
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

// POST /login — SQL Injection in username field
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, error: 'Username and password required' });
  }

  // VULNERABLE: SQL Injection via string concatenation
  // The developer assumed usernames are safe because "who would inject their own login?"
  const query = `SELECT * FROM users WHERE username = '${username}'`;

  pool.query(query, (err, results) => {
    if (err) {
      // VULNERABLE: Full SQL error message returned
      console.error('[AUTH] Login query error:', err.message);
      return res.status(500).json({
        success: false,
        error: 'Database error',
        // VULNERABLE: error detail exposure controlled by debug param
        detail: req.query.debug === '1' ? err.message : undefined,
        query: req.query.debug === '1' ? query : undefined
      });
    }

    if (results.length === 0) {
      // VULNERABLE: Different error message for "user not found" vs "wrong password"
      // Enables username enumeration
      return res.status(401).json({ success: false, error: 'User not found' });
    }

    const user = results[0];

    // Compare password with bcrypt hash
    bcrypt.compare(password, user.password, (err, isMatch) => {
      if (err || !isMatch) {
        // Check plaintext fallback (some legacy accounts)
        if (password === user.password) {
          // Plaintext match — set session and return
          return loginSuccess(req, res, user);
        }
        return res.status(401).json({ success: false, error: 'Invalid password' });
      }
      return loginSuccess(req, res, user);
    });
  });
});

function loginSuccess(req, res, user) {
  // Set session data
  req.session.userId = user.id;
  req.session.username = user.username;
  req.session.role = user.role;
  req.session.email = user.email;

  // Store session in sessions_store table for later extraction via SQLi
  const sessionToken = uuidv4();
  const storeQuery = `INSERT INTO sessions_store (session_id, user_id, token, ip_address, user_agent) 
                      VALUES ('${req.sessionID}', ${user.id}, '${sessionToken}', '${req.clientIp}', '${req.headers['user-agent']}')`;
  pool.query(storeQuery, () => {}); // Fire and forget

  res.json({
    success: true,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      email: user.email,
      nickname: user.nickname,
      balance: user.balance,
      is_verified: user.is_verified
    },
    token: sessionToken
  });
}

// POST /register — SQL Injection in INSERT, second-order SQLi via nickname
router.post('/register', (req, res) => {
  const { username, email, password, nickname } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, error: 'Username and password required' });
  }

  // Hash password
  const hash = bcrypt.hashSync(password, 10);

  // VULNERABLE: SQL Injection in INSERT statement
  // The nickname is stored unsanitized — triggers second-order SQLi
  // when admin views user profile and nickname is used in another query
  const query = `INSERT INTO users (username, email, password, nickname, role) 
                 VALUES ('${username}', '${email || ''}', '${hash}', '${nickname || username}', 'buyer')`;

  pool.query(query, (err, result) => {
    if (err) {
      // VULNERABLE: Error reveals if username already exists
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ success: false, error: 'Username already exists' });
      }
      return res.status(500).json({
        success: false,
        error: 'Registration failed',
        detail: req.query.debug === '1' ? err.message : undefined
      });
    }

    res.json({
      success: true,
      message: 'Account created successfully',
      userId: result.insertId
    });
  });
});

// POST /api/v1/auth/login — NoSQL Injection via MongoDB
router.post('/api/v1/auth/login', async (req, res) => {
  try {
    const { getDb } = require('../config/mongodb');
    const db = getDb();

    // VULNERABLE: NoSQL Injection — req.body passed directly to findOne
    // Attacker can send: {"username": {"$ne": ""}, "password": {"$ne": ""}}
    // to bypass authentication entirely
    const user = await db.collection('users_nosql').findOne({
      username: req.body.username,
      password: req.body.password
    });

    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    req.session.userId = user._id;
    req.session.username = user.username;
    req.session.role = user.role;

    res.json({
      success: true,
      user: { username: user.username, role: user.role },
      message: 'Authenticated via NoSQL service'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /logout
router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    res.clearCookie('hellcorp_sid');
    res.json({ success: true, message: 'Session terminated' });
  });
});

// GET /api/v1/auth/me — Current user info
router.get('/api/v1/auth/me', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ success: false, error: 'Not authenticated' });
  }
  res.json({
    success: true,
    user: {
      id: req.session.userId,
      username: req.session.username,
      role: req.session.role,
      email: req.session.email
    }
  });
});

module.exports = router;
