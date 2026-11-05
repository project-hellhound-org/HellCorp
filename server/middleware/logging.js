// Request logging middleware
// Logs all requests to file and MongoDB for admin log viewer
const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '../../logs');
const LOG_FILE = path.join(LOG_DIR, 'access.log');

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

function loggingMiddleware(req, res, next) {
  const timestamp = new Date().toISOString();
  // VULNERABLE: Trust X-Forwarded-For header without validation
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
  const method = req.method;
  const url = req.originalUrl;
  // VULNERABLE: User-Agent is stored raw — no sanitization
  // This enables CRLF log forging when viewing logs
  const userAgent = req.headers['user-agent'] || 'unknown';

  // Build log line — VULNERABLE: no CRLF sanitization
  // An attacker can inject \r\n in User-Agent to forge log entries
  const logLine = `[${timestamp}] ${ip} ${method} ${url} "${userAgent}"\n`;

  // Write to file (async, non-blocking)
  fs.appendFile(LOG_FILE, logLine, (err) => {
    if (err) console.error('[LOG] File write error:', err.message);
  });

  // Store in MongoDB audit_logs collection
  try {
    const { getDb } = require('../config/mongodb');
    const db = getDb();
    db.collection('audit_logs').insertOne({
      timestamp,
      ip,
      method,
      url,
      userAgent, // Raw, unsanitized — Blind XSS when admin views logs
      userId: req.session?.userId || null,
      headers: {
        host: req.headers.host,
        referer: req.headers.referer,
        contentType: req.headers['content-type']
      }
    }).catch(() => {}); // Silently fail if MongoDB not ready
  } catch (e) {
    // MongoDB might not be connected yet
  }

  // Attach to request for later use
  req.clientIp = ip;
  req.logTimestamp = timestamp;

  next();
}

module.exports = loggingMiddleware;
