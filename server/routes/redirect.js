// Redirect handler — CRLF Injection (HTTP response splitting)
const express = require('express');
const router = express.Router();

// GET /redirect — CRLF Injection
router.get('/', (req, res) => {
  const url = req.query.url;

  if (!url) {
    return res.status(400).json({ success: false, error: 'URL parameter required' });
  }

  // VULNERABLE: CRLF Injection — url parameter set as Location header without sanitization
  // Payload: /redirect?url=http://example.com%0d%0aSet-Cookie:evil=true
  // Payload: /redirect?url=http://example.com%0d%0a%0d%0a<html><script>alert(1)</script></html>
  // This allows response splitting: injecting arbitrary headers and even body content
  res.writeHead(302, {
    'Location': url  // VULNERABLE: No CRLF filtering
  });
  res.end();
});

module.exports = router;
