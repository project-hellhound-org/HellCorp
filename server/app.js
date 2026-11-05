// HellCorp — Main Application Server
// Enterprise Solutions for the Discerning Professional
// TODO: Add security headers before production deployment
// TODO: Implement rate limiting
// TODO: Add CSRF protection
const express = require('express');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── CORS ────────────────────────────────────────────────────
// VULNERABLE: CORS with wildcard origin allows any site to make requests
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Forwarded-For', 'X-Forwarded-Host'],
  credentials: false  // Can't use credentials with wildcard, but still too permissive
}));

// ─── Body Parsing ────────────────────────────────────────────
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());

// ─── Debug Mode ──────────────────────────────────────────────
// VULNERABLE: Global debug mode via query parameter
app.use((req, res, next) => {
  if (req.query.debug === '1' || process.env.DEBUG_MODE === 'true') {
    app.locals.debug = true;
    // VULNERABLE: Adds server info to response headers
    res.setHeader('X-Debug-Mode', 'enabled');
    res.setHeader('X-Server-Version', 'HellCorp/3.1.4-dev');
    res.setHeader('X-Powered-By', 'Express/Node.js ' + process.version);
  }
  next();
});

// ─── NO Security Headers ─────────────────────────────────────
// VULNERABLE: Deliberately omitting all security headers
// No helmet, no CSP, no X-Frame-Options, no X-Content-Type-Options
// This allows: clickjacking, MIME sniffing, XSS without CSP blocking
app.disable('x-powered-by'); // Actually, let's keep it for info disclosure
app.enable('x-powered-by');

// ─── Static Files ────────────────────────────────────────────
app.use(express.static(path.join(__dirname, '../public')));

// VULNERABLE: Serve .env file (information disclosure)
app.use('/.env', express.static(path.join(__dirname, '../.env')));

// VULNERABLE: Serve exposed .git directory (information disclosure)
app.use('/.git', express.static(path.join(__dirname, '../.git-exposed')));

// Serve robots.txt (reveals hidden endpoints)
app.use('/robots.txt', express.static(path.join(__dirname, '../robots.txt')));

// ─── Initialize Services ────────────────────────────────────
const { connectMongo } = require('./config/mongodb');
const { redisClient, connectRedis } = require('./config/redis');
const { startLdap } = require('./services/ldap-server');
const setupSession = require('./middleware/session');
const loggingMiddleware = require('./middleware/logging');

async function initializeApp() {
  // Connect databases
  await connectRedis();
  await connectMongo();

  // Start LDAP server
  try { startLdap(); } catch (e) { console.error('[LDAP] Failed to start:', e.message); }

  // ─── Session ─────────────────────────────────────────────
  setupSession(app, redisClient);

  // ─── Logging Middleware ──────────────────────────────────
  app.use(loggingMiddleware);

  // ─── Mount Routes ────────────────────────────────────────
  const authRoutes = require('./routes/auth');
  const productRoutes = require('./routes/products');
  const adminRoutes = require('./routes/admin');
  const sellerRoutes = require('./routes/seller');
  const messagingRoutes = require('./routes/messaging');
  const supportRoutes = require('./routes/support');
  const apiRoutes = require('./routes/api');
  const graphqlRoutes = require('./routes/graphql');
  const exportRoutes = require('./routes/export');
  const xmlRoutes = require('./routes/xml-export');
  const paymentRoutes = require('./routes/payment');
  const redirectRoutes = require('./routes/redirect');
  const resetRoutes = require('./routes/reset');
  const ldapRoutes = require('./routes/ldap-auth');
  const ssiRoutes = require('./routes/ssi');
  const reviewRoutes = require('./routes/reviews');

  // Auth
  app.use('/', authRoutes);

  // Products (both HTML and API)
  app.use('/products', productRoutes);
  app.use('/api/v1/products', apiRoutes);

  // Admin panel
  app.use('/admin', adminRoutes);

  // Seller dashboard
  app.use('/seller', sellerRoutes);

  // Messaging
  app.use('/messages', messagingRoutes);

  // Support
  app.use('/support', supportRoutes);

  // REST API
  app.use('/api/v1', apiRoutes);

  // GraphQL
  app.use('/graphql', graphqlRoutes);

  // Export (CSV)
  app.use('/export', exportRoutes);

  // XML/XPath
  app.use('/xml', xmlRoutes);

  // Payment (SOAP)
  app.use('/services', paymentRoutes);
  app.use('/xml', paymentRoutes);

  // Redirect (CRLF)
  app.use('/redirect', redirectRoutes);

  // Password Reset & Contact
  app.use('/', resetRoutes);

  // LDAP Auth
  app.use('/admin', ldapRoutes);
  app.use('/internal', ldapRoutes);

  // SSI Pages
  app.use('/pages', ssiRoutes);

  // Reviews API
  app.use('/api/v1/reviews', reviewRoutes);

  // ─── Announcements endpoint ────────────────────────────
  app.get('/api/v1/announcements', (req, res) => {
    const { pool } = require('./config/database');
    pool.query('SELECT * FROM announcements ORDER BY created_at DESC LIMIT 10', (err, results) => {
      if (err) return res.status(500).json({ success: false, error: err.message });
      res.json({ success: true, announcements: results });
    });
  });

  // ─── User profile endpoint ─────────────────────────────
  app.get('/api/v1/profile', (req, res) => {
    if (!req.session?.userId) return res.status(401).json({ success: false, error: 'Not authenticated' });
    const { pool } = require('./config/database');
    pool.query(`SELECT * FROM users WHERE id = ${req.session.userId}`, (err, results) => {
      if (err) return res.status(500).json({ success: false, error: err.message });
      if (results.length === 0) return res.status(404).json({ success: false, error: 'User not found' });
      const user = results[0];
      delete user.password;
      res.json({ success: true, user });
    });
  });

  app.put('/api/v1/profile', (req, res) => {
    if (!req.session?.userId) return res.status(401).json({ success: false, error: 'Not authenticated' });
    const { pool } = require('./config/database');
    const { nickname, bio, address, email, custom_js, custom_css } = req.body;
    const updates = [];
    if (nickname !== undefined) updates.push(`nickname = '${nickname}'`);
    if (bio !== undefined) updates.push(`bio = '${bio}'`);
    if (address !== undefined) updates.push(`address = '${address}'`);
    if (email !== undefined) updates.push(`email = '${email}'`);
    if (custom_js !== undefined) updates.push(`custom_js = '${custom_js}'`);
    if (custom_css !== undefined) updates.push(`custom_css = '${custom_css}'`);
    if (updates.length === 0) return res.status(400).json({ success: false, error: 'No fields to update' });
    pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ${req.session.userId}`, (err) => {
      if (err) return res.status(500).json({ success: false, error: err.message });
      res.json({ success: true, message: 'Profile updated' });
    });
  });

  // ─── Seed MongoDB on first run ─────────────────────────
  try {
    const { getDb } = require('./config/mongodb');
    const db = getDb();
    const existingUsers = await db.collection('users_nosql').countDocuments();
    if (existingUsers === 0) {
      console.log('[SEED] Seeding MongoDB collections...');
      await db.collection('users_nosql').insertMany([
        { username: 'admin', password: 'admin123', role: 'admin', email: 'admin@hellcorp.onion' },
        { username: 'darkvendor', password: 'vendor123', role: 'seller', email: 'vendor@hellcorp.onion' },
        { username: 'buyer1', password: 'buyer123', role: 'buyer', email: 'buyer1@hellcorp.onion' },
        { username: 'ghostuser', password: 'ghost99', role: 'buyer', email: 'ghost@hellcorp.onion' }
      ]);
      await db.collection('site_config').insertMany([
        { key: 'maintenance_mode', value: false, updatedAt: new Date() },
        { key: 'debug', value: true, updatedAt: new Date() },
        { key: 'secret_admin_key', value: 'hc_super_secret_2024', updatedAt: new Date() },
        { key: 'encryption_algorithm', value: 'AES-256-CBC', updatedAt: new Date() },
        { key: 'backup_schedule', value: '0 2 * * *', updatedAt: new Date() }
      ]);
      await db.collection('reviews').insertMany([
        { productId: '1', username: 'ghostuser', rating: 5, title: 'Excellent tool', comment: 'Works perfectly against modern EDR. Bypassed CrowdStrike on first try.', createdAt: new Date().toISOString() },
        { productId: '2', username: 'buyer1', rating: 4, title: 'Good quality', comment: 'Credentials are fresh. About 60% success rate.', createdAt: new Date().toISOString() },
        { productId: '3', username: 'ghostuser', rating: 5, title: 'Professional grade', comment: 'Clean, undetected by any AV I tested. FUD guarantee held up.', createdAt: new Date().toISOString() }
      ]);
      console.log('[SEED] MongoDB seeded successfully');
    }
  } catch (e) {
    console.log('[SEED] MongoDB seed skipped:', e.message);
  }

  // ─── SPA Fallback ──────────────────────────────────────
  app.get('*', (req, res) => {
    // Don't serve index.html for API routes or file requests
    if (req.path.startsWith('/api/') || req.path.startsWith('/graphql') || req.path.includes('.')) {
      return res.status(404).json({ success: false, error: 'Not found' });
    }
    res.sendFile(path.join(__dirname, '../public/index.html'));
  });

  // ─── Error Handler ─────────────────────────────────────
  // VULNERABLE: Full stack traces in error responses
  app.use((err, req, res, next) => {
    console.error('[ERROR]', err.stack);
    res.status(err.status || 500).json({
      success: false,
      error: err.message,
      // VULNERABLE: Stack trace exposure
      stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
      path: req.originalUrl,
      method: req.method,
      timestamp: new Date().toISOString()
    });
  });

  // ─── Start Server ──────────────────────────────────────
  app.listen(PORT, '0.0.0.0', () => {
    console.log('');
    console.log('  ██╗  ██╗███████╗██╗     ██╗      ██████╗ ██████╗ ██████╗ ██████╗ ');
    console.log('  ██║  ██║██╔════╝██║     ██║     ██╔════╝██╔═══██╗██╔══██╗██╔══██╗');
    console.log('  ███████║█████╗  ██║     ██║     ██║     ██║   ██║██████╔╝██████╔╝');
    console.log('  ██╔══██║██╔══╝  ██║     ██║     ██║     ██║   ██║██╔══██╗██╔═══╝ ');
    console.log('  ██║  ██║███████╗███████╗███████╗╚██████╗╚██████╔╝██║  ██║██║     ');
    console.log('  ╚═╝  ╚═╝╚══════╝╚══════╝╚══════╝ ╚═════╝ ╚═════╝╚═╝  ╚═╝╚═╝     ');
    console.log('');
    console.log(`  [*] HellCorp server running on port ${PORT}`);
    console.log(`  [*] Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`  [*] Debug mode: ${process.env.DEBUG_MODE || 'false'}`);
    console.log(`  [*] GraphiQL: http://localhost:${PORT}/graphql`);
    console.log('');
  });
}

// Fire it up
initializeApp().catch(err => {
  console.error('[FATAL] Failed to initialize:', err);
  // Still try to start the server even if some services fail
  app.listen(PORT, () => {
    console.log(`[WARN] HellCorp started in degraded mode on port ${PORT}`);
  });
});

module.exports = app;
