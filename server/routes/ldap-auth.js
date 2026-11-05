// LDAP Authentication routes — LDAP Injection
const express = require('express');
const router = express.Router();
const ldap = require('ldapjs');

const LDAP_URL = process.env.LDAP_URL || 'ldap://localhost:1389';
const BASE_DN = process.env.LDAP_BASE_DN || 'dc=hellcorp,dc=com';

// POST /admin/ldap-login — LDAP Injection in uid filter
router.post('/ldap-login', (req, res) => {
  const { username, password } = req.body;

  if (!username) {
    return res.status(400).json({ success: false, error: 'Username required' });
  }

  const client = ldap.createClient({ url: LDAP_URL });

  // VULNERABLE: LDAP Injection — username directly interpolated into filter
  // Payload: *)(uid=*))(|(uid=*   → makes filter always true
  // Payload: *  → wildcard returns all entries
  // Payload: admin)(|(uid=*  → bypass to match admin
  const filter = `(&(uid=${username})(objectClass=inetOrgPerson))`;

  console.log(`[LDAP] Auth filter: ${filter}`);

  client.search(BASE_DN, {
    filter: filter,
    scope: 'sub',
    attributes: ['uid', 'cn', 'mail', 'title', 'departmentNumber', 'userPassword']
  }, (err, searchRes) => {
    if (err) {
      client.unbind();
      return res.status(500).json({ success: false, error: 'LDAP search failed: ' + err.message });
    }

    const entries = [];
    searchRes.on('searchEntry', (entry) => {
      entries.push(entry.pojo);
    });

    searchRes.on('error', (err) => {
      client.unbind();
      return res.status(500).json({ success: false, error: 'LDAP error: ' + err.message });
    });

    searchRes.on('end', () => {
      client.unbind();

      if (entries.length === 0) {
        // VULNERABLE: Different error for "user not found" vs "wrong password"
        return res.status(401).json({ success: false, error: 'User not found in directory' });
      }

      // Check password (if provided)
      const entry = entries[0];
      const attrs = {};
      entry.attributes.forEach(a => { attrs[a.type] = a.values[0]; });

      if (password && attrs.userPassword !== password) {
        return res.status(401).json({ success: false, error: 'Invalid credentials' });
      }

      // Set admin session
      req.session.userId = 0; // LDAP user, no DB id
      req.session.username = attrs.uid || attrs.cn;
      req.session.role = 'admin';
      req.session.email = attrs.mail;
      req.session.authMethod = 'ldap';

      res.json({
        success: true,
        message: 'LDAP authentication successful',
        user: {
          uid: attrs.uid,
          cn: attrs.cn,
          mail: attrs.mail,
          title: attrs.title,
          department: attrs.departmentNumber
        },
        entriesFound: entries.length // VULNERABLE: reveals how many matched
      });
    });
  });
});

// GET /internal/staff — LDAP Injection in directory search
router.get('/staff', (req, res) => {
  if (!req.session?.userId && req.session?.role !== 'seller' && req.session?.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Access denied' });
  }

  const search = req.query.search || '*';

  const client = ldap.createClient({ url: LDAP_URL });

  // VULNERABLE: LDAP Injection — search term directly in filter
  // Payload: * → returns all entries
  // Payload: *)(uid=flag*  → enumerate hidden entries
  const filter = `(|(uid=${search})(cn=${search})(mail=${search}))`;

  console.log(`[LDAP] Directory search filter: ${filter}`);

  client.search(BASE_DN, {
    filter: filter,
    scope: 'sub',
    attributes: ['uid', 'cn', 'mail', 'title', 'departmentNumber', 'sn', 'givenName']
  }, (err, searchRes) => {
    if (err) {
      client.unbind();
      return res.status(500).json({ success: false, error: err.message });
    }

    const entries = [];
    searchRes.on('searchEntry', (entry) => {
      const attrs = {};
      entry.pojo.attributes.forEach(a => { attrs[a.type] = a.values[0]; });
      entries.push(attrs);
    });

    searchRes.on('end', () => {
      client.unbind();
      res.json({
        success: true,
        results: entries,
        count: entries.length,
        filter: filter // VULNERABLE: reveals the LDAP filter used
      });
    });
  });
});

module.exports = router;
