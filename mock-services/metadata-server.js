// Mock AWS EC2 Metadata Service
// Simulates the instance metadata endpoint at 169.254.169.254
// Used for SSRF testing — when attacker can make the server request this endpoint
const express = require('express');
const app = express();
const PORT = 8169;

// Fake IAM credentials
const iamCredentials = {
  Code: 'Success',
  LastUpdated: '2024-10-01T12:00:00Z',
  Type: 'AWS-HMAC',
  AccessKeyId: 'ASIAHELLCORPFAKEKEY01',
  SecretAccessKey: 'HellCorpFakeSecretKey/WithSlash+AndPlus2024',
  Token: 'FwoGZXIvYXdzEBYaDHellCorpFakeSessionToken1234567890abcdefghijklmnopqrstuvwxyz',
  Expiration: '2025-12-31T23:59:59Z'
};

const instanceIdentity = {
  devpayProductCodes: null,
  marketplaceProductCodes: null,
  availabilityZone: 'us-east-1a',
  privateIp: '10.0.0.42',
  version: '2017-09-30',
  instanceId: 'i-0hellcorp666abc',
  billingProducts: null,
  instanceType: 't3.xlarge',
  accountId: '666013371337',
  imageId: 'ami-0hellcorp666',
  pendingTime: '2024-01-15T08:00:00Z',
  architecture: 'x86_64',
  kernelId: null,
  ramdiskId: null,
  region: 'us-east-1'
};

const userData = `#!/bin/bash
# HellCorp Instance Bootstrap Script
# Last modified: 2024-10-01

export DB_HOST="hellcorp-prod-db.c9abc123.us-east-1.rds.amazonaws.com"
export DB_USER="hellcorp_prod"
export DB_PASS="pr0d_db_p4ss_2024_s3cr3t"
export REDIS_URL="redis://hellcorp-prod-cache.abc123.ng.0001.use1.cache.amazonaws.com:6379"
export AWS_SECRET_ACCESS_KEY="wJalrXUtnFEMI/K7MDENG/bPxRfiCYHELLCORP_PROD"
export JWT_SECRET="pr0d_jwt_s3cr3t_k3y_n3v3r_l34k_th1s"

# Pull latest from ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 666013371337.dkr.ecr.us-east-1.amazonaws.com
docker pull 666013371337.dkr.ecr.us-east-1.amazonaws.com/hellcorp:latest
docker run -d --restart always -p 3000:3000 hellcorp:latest
`;

// Directory listings
const metadataTree = {
  'latest': ['meta-data/', 'user-data', 'dynamic/'],
  'latest/meta-data': [
    'ami-id', 'ami-launch-index', 'ami-manifest-path',
    'hostname', 'instance-action', 'instance-id', 'instance-type',
    'local-hostname', 'local-ipv4', 'mac', 'network/',
    'placement/', 'profile', 'public-hostname', 'public-ipv4',
    'reservation-id', 'security-groups', 'iam/'
  ],
  'latest/meta-data/iam': ['info', 'security-credentials/'],
  'latest/meta-data/iam/security-credentials': ['hellcorp-ec2-role'],
  'latest/meta-data/placement': ['availability-zone', 'region'],
  'latest/dynamic': ['instance-identity/'],
  'latest/dynamic/instance-identity': ['document', 'pkcs7', 'signature']
};

// Individual metadata values
const metadataValues = {
  'latest/meta-data/ami-id': 'ami-0hellcorp666',
  'latest/meta-data/ami-launch-index': '0',
  'latest/meta-data/ami-manifest-path': '(unknown)',
  'latest/meta-data/hostname': 'ip-10-0-0-42.ec2.internal',
  'latest/meta-data/instance-action': 'none',
  'latest/meta-data/instance-id': 'i-0hellcorp666abc',
  'latest/meta-data/instance-type': 't3.xlarge',
  'latest/meta-data/local-hostname': 'ip-10-0-0-42.ec2.internal',
  'latest/meta-data/local-ipv4': '10.0.0.42',
  'latest/meta-data/mac': '0e:66:6d:ea:db:ef',
  'latest/meta-data/profile': 'default-hvm',
  'latest/meta-data/public-hostname': 'ec2-203-0-113-42.compute-1.amazonaws.com',
  'latest/meta-data/public-ipv4': '203.0.113.42',
  'latest/meta-data/reservation-id': 'r-0hellcorp666res',
  'latest/meta-data/security-groups': 'hellcorp-sg-prod',
  'latest/meta-data/placement/availability-zone': 'us-east-1a',
  'latest/meta-data/placement/region': 'us-east-1',
  'latest/meta-data/iam/info': JSON.stringify({
    Code: 'Success',
    LastUpdated: '2024-10-01T12:00:00Z',
    InstanceProfileArn: 'arn:aws:iam::666013371337:instance-profile/hellcorp-ec2-role',
    InstanceProfileId: 'AIPAHELLCORP666FAKE'
  }),
  'latest/meta-data/iam/security-credentials/hellcorp-ec2-role': JSON.stringify(iamCredentials, null, 2),
  'latest/user-data': userData,
  'latest/dynamic/instance-identity/document': JSON.stringify(instanceIdentity, null, 2),
  'latest/dynamic/instance-identity/pkcs7': 'MIAGCSqGSIb3DQEHAqCAMIACAQExCzAJBgUrDgMCGgUA...FAKE_PKCS7_DATA...',
  'latest/dynamic/instance-identity/signature': 'dA0bHellCorpFakeSignature1234567890abcdef=='
};

// Handle all paths using regex
app.all(/.*/, (req, res) => {
  const reqPath = req.path.replace(/^\/+/, '').replace(/\/+$/, '');

  // Check for directory listing
  if (metadataTree[reqPath]) {
    return res.type('text/plain').send(metadataTree[reqPath].join('\n'));
  }

  // Check for direct value
  if (metadataValues[reqPath]) {
    return res.type('text/plain').send(metadataValues[reqPath]);
  }

  // Root
  if (reqPath === '' || reqPath === '/') {
    return res.type('text/plain').send('latest');
  }

  res.status(404).type('text/html').send(`
    <?xml version="1.0" encoding="iso-8859-1"?>
    <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
    <html xmlns="http://www.w3.org/1999/xhtml">
    <head><title>404 - Not Found</title></head>
    <body><h1>404 - Not Found</h1></body></html>
  `);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[METADATA] Mock EC2 metadata service running on port ${PORT}`);
});
