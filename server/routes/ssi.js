// SSI (Server Side Includes) routes — SSI Injection
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const PAGES_DIR = path.join(__dirname, '../../public/pages');

// Custom SSI processor — handles #include, #echo, #exec directives
function processSSI(content, req, callback) {
  let output = content;
  let pending = 0;
  let finished = false;

  // Process <!--#echo var="..." -->
  output = output.replace(/<!--#echo\s+var="([^"]+)"\s*-->/gi, (match, varName) => {
    const vars = {
      'DATE_LOCAL': new Date().toLocaleString(),
      'DATE_GMT': new Date().toUTCString(),
      'DOCUMENT_NAME': req.query.page || 'index.shtml',
      'DOCUMENT_URI': req.originalUrl,
      'REMOTE_ADDR': req.clientIp || req.ip,
      'SERVER_NAME': req.headers.host,
      'SERVER_SOFTWARE': 'HellCorp/1.0',
      'QUERY_STRING': require('url').parse(req.url).query || '',
      'HTTP_USER_AGENT': req.headers['user-agent'],
      'HTTP_REFERER': req.headers.referer || ''
    };
    return vars[varName] || `(unknown: ${varName})`;
  });

  // Process <!--#include virtual="..." -->
  const includeRegex = /<!--#include\s+virtual="([^"]+)"\s*-->/gi;
  const includes = [...output.matchAll(includeRegex)];

  if (includes.length === 0) {
    // Process exec directives
    return processExecDirectives(output, callback);
  }

  pending = includes.length;

  includes.forEach(match => {
    const virtualPath = match[1];
    // VULNERABLE: Path traversal — no sanitization of virtual path
    const filePath = path.join(PAGES_DIR, virtualPath);

    fs.readFile(filePath, 'utf8', (err, fileContent) => {
      if (err) {
        output = output.replace(match[0], `<!-- SSI include error: ${err.message} -->`);
      } else {
        output = output.replace(match[0], fileContent);
      }
      pending--;
      if (pending === 0) {
        processExecDirectives(output, callback);
      }
    });
  });
}

// Process <!--#exec cmd="..." --> directives
// VULNERABLE: SSI Injection — allows arbitrary command execution
function processExecDirectives(content, callback) {
  const execRegex = /<!--#exec\s+cmd="([^"]+)"\s*-->/gi;
  const execs = [...content.matchAll(execRegex)];

  if (execs.length === 0) {
    return callback(null, content);
  }

  let output = content;
  let pending = execs.length;

  execs.forEach(match => {
    const cmd = match[1];

    // VULNERABLE: Command execution from SSI directive
    // If attacker can inject SSI directives into page content,
    // they achieve RCE via <!--#exec cmd="whoami" -->
    exec(cmd, { timeout: 5000 }, (err, stdout, stderr) => {
      if (err) {
        output = output.replace(match[0], `<!-- exec error: ${err.message} -->`);
      } else {
        output = output.replace(match[0], stdout.trim());
      }
      pending--;
      if (pending === 0) {
        callback(null, output);
      }
    });
  });
}

// GET /pages — SSI Injection via page parameter
router.get('/', (req, res) => {
  const page = req.query.page || 'about.shtml';

  // VULNERABLE: Path traversal + SSI Injection
  // The page parameter controls which file is loaded and processed for SSI
  // Payload: ?page=../../.env  → reads .env file
  // If attacker can upload a file with SSI directives, they get RCE
  const filePath = path.join(PAGES_DIR, page);

  console.log(`[SSI] Loading page: ${filePath}`);

  fs.readFile(filePath, 'utf8', (err, content) => {
    if (err) {
      return res.status(404).send(`
        <html><body style="background:#050505;color:#f0ece4;font-family:monospace;padding:60px;text-align:center;">
          <h1 style="color:#ff1a1a;">Page Not Found</h1>
          <p style="color:#a09a90;">File: ${page}</p>
          <p style="color:#333;font-size:11px;">Error: ${err.message}</p>
        </body></html>
      `);
    }

    // Process SSI directives
    processSSI(content, req, (err2, processed) => {
      if (err2) {
        return res.status(500).send('SSI processing error: ' + err2.message);
      }
      res.type('html').send(processed);
    });
  });
});

module.exports = router;
