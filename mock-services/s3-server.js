// Mock S3-compatible object storage server
// Deliberately misconfigured — no authentication required
const express = require('express');
const app = express();
const PORT = 9000;

app.use(express.raw({ type: '*/*', limit: '50mb' }));

// In-memory storage
const buckets = {
  'hellcorp-assets': {
    objects: {
      'config/database.yml': {
        body: Buffer.from(`# HellCorp Database Configuration
production:
  adapter: mysql2
  host: hellcorp-prod-db.c9abc123.us-east-1.rds.amazonaws.com
  port: 3306
  database: hellcorp_production
  username: hellcorp_prod
  password: pr0d_db_p4ss_2024_s3cr3t
  pool: 25
  timeout: 5000

staging:
  adapter: mysql2
  host: hellcorp-staging-db.internal
  database: hellcorp_staging
  username: hellcorp_stage
  password: st4g1ng_p4ss_2024
`),
        contentType: 'text/yaml',
        lastModified: new Date('2024-09-15')
      },
      'backups/users-dump.sql': {
        body: Buffer.from(`-- HellCorp User Export
-- Generated: 2024-10-01

INSERT INTO users (id, username, email, password, role) VALUES
(1, 'admin', 'admin@hellcorp.onion', '$2a$10$adminpasswordhash123456', 'admin'),
(2, 'darkvendor', 'vendor@darkweb.onion', '$2a$10$vendorpasswordhash789', 'seller'),
(3, 'shadowmerch', 'shadow@protonmail.com', '$2a$10$shadowpasswordhash456', 'seller'),
(4, 'buyer1', 'buyer1@tormail.onion', '$2a$10$buyerpasswordhash111', 'buyer'),
(5, 'ghostuser', 'ghost@ghostmail.onion', '$2a$10$ghostpasswordhash222', 'buyer'),
(6, 'sysadmin', 'sysadmin@hellcorp.onion', '$2a$10$sysadminpasshash333', 'admin');
`),
        contentType: 'application/sql',
        lastModified: new Date('2024-10-01')
      },
      'secrets/api-keys.txt': {
        body: Buffer.from(`# HellCorp API Keys Registry
# DO NOT SHARE — INTERNAL USE ONLY

ADMIN_API_KEY=hc_admin_api_k3y_x9z8y7
STRIPE_SECRET_KEY=sk_live_hellcorp_fake_stripe_key_2024
SENDGRID_API_KEY=SG.hellcorp_fake_sendgrid_key
TWILIO_AUTH_TOKEN=hellcorp_fake_twilio_auth_token
SLACK_WEBHOOK=https://hooks.slack.com/services/T00/B00/hellcorp_fake
GITHUB_TOKEN=ghp_hellcorpFakeGitHubToken1234567890ab
AWS_SECRET=wJalrXUtnFEMI/K7MDENG/bPxRfiCYHELLCORP
`),
        contentType: 'text/plain',
        lastModified: new Date('2024-08-20')
      },
      'logs/error-2024-09.log': {
        body: Buffer.from(`[2024-09-15 03:22:11] ERROR: Database connection failed - credentials expired
[2024-09-15 03:22:11] DEBUG: Attempting reconnect with user=hellcorp_prod pass=pr0d_db_p4ss_2024
[2024-09-18 14:05:33] ERROR: Payment webhook signature verification failed
[2024-09-18 14:05:33] DEBUG: Expected sig: whsec_hellcorp_webhook_secret_2024
[2024-09-22 09:11:00] WARN: Rate limit exceeded for IP 203.0.113.42
`),
        contentType: 'text/plain',
        lastModified: new Date('2024-09-22')
      }
    }
  }
};

// GET / — List all buckets (XML format like real S3)
app.get('/', (req, res) => {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<ListAllMyBucketsResult>\n<Buckets>\n';
  for (const name of Object.keys(buckets)) {
    xml += `  <Bucket><Name>${name}</Name><CreationDate>2024-01-01T00:00:00.000Z</CreationDate></Bucket>\n`;
  }
  xml += '</Buckets>\n</ListAllMyBucketsResult>';
  res.type('application/xml').send(xml);
});

// GET /:bucket — List objects in bucket
app.get(/^\/([^/]+)$/, (req, res) => {
  const bucketName = req.params[0];
  const bucket = buckets[bucketName];
  if (!bucket) return res.status(404).type('xml').send('<?xml version="1.0"?><Error><Code>NoSuchBucket</Code></Error>');

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<ListBucketResult>\n<Name>${bucketName}</Name>\n<Contents>\n`;
  for (const [key, obj] of Object.entries(bucket.objects)) {
    xml += `  <Key>${key}</Key>\n  <LastModified>${obj.lastModified.toISOString()}</LastModified>\n  <Size>${obj.body.length}</Size>\n`;
  }
  xml += '</Contents>\n</ListBucketResult>';
  res.type('application/xml').send(xml);
});

// GET/PUT /:bucket/key — Get/Store object (regex based)
app.all(/^\/([^/]+)\/(.+)$/, (req, res) => {
  const bucketName = req.params[0];
  const key = req.params[1];
  const bucket = buckets[bucketName];

  if (req.method === 'GET') {
    if (!bucket || !bucket.objects[key]) {
      return res.status(404).type('xml').send('<?xml version="1.0"?><Error><Code>NoSuchKey</Code></Error>');
    }
    const obj = bucket.objects[key];
    res.type(obj.contentType).send(obj.body);
  } else if (req.method === 'PUT') {
    if (!buckets[bucketName]) buckets[bucketName] = { objects: {} };
    buckets[bucketName].objects[key] = {
      body: req.body,
      contentType: req.headers['content-type'] || 'application/octet-stream',
      lastModified: new Date()
    };
    res.status(200).send('');
  } else {
    res.status(405).send('Method Not Allowed');
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[S3] Mock S3 server running on port ${PORT}`);
  console.log(`[S3] Bucket: hellcorp-assets (${Object.keys(buckets['hellcorp-assets'].objects).length} objects)`);
});
