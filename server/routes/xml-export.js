// XML/XPath routes — XPath Injection, XML export
const express = require('express');
const router = express.Router();
const { DOMParser } = require('@xmldom/xmldom');
const xpath = require('xpath');
const { pool } = require('../config/database');

// Build XML document from products (cached)
let productsXml = null;

function buildProductsXml(callback) {
  pool.query('SELECT * FROM products', (err, results) => {
    if (err) return callback(err);

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<catalog>\n';
    results.forEach(p => {
      xml += `  <product id="${p.product_id}">
    <name>${p.name}</name>
    <category>${p.category}</category>
    <tier>${p.tier}</tier>
    <price>${p.price}</price>
    <description>${p.description}</description>
    <seller_id>${p.seller_id}</seller_id>
    <hidden>${p.is_hidden}</hidden>
  </product>\n`;
    });
    xml += '</catalog>';

    productsXml = xml;
    callback(null, xml);
  });
}

// Partner auth XML (for XPath auth bypass)
const authXml = `<?xml version="1.0" encoding="UTF-8"?>
<partners>
  <partner>
    <username>partner_admin</username>
    <password>p4rtn3r_s3cr3t_2024</password>
    <role>admin</role>
    <apiKey>pk_live_partner_admin_key</apiKey>
  </partner>
  <partner>
    <username>partner_reseller</username>
    <password>r3s3ll3r_p4ss</password>
    <role>reseller</role>
    <apiKey>pk_live_partner_reseller_key</apiKey>
  </partner>
  <partner>
    <username>partner_bulk</username>
    <password>bulk_pr1c1ng_2024</password>
    <role>bulk</role>
    <apiKey>pk_live_partner_bulk_key</apiKey>
  </partner>
</partners>`;

// GET /xml/products — XPath Injection in category filter
router.get('/products', (req, res) => {
  const category = req.query.category || '';

  const processQuery = (xml) => {
    try {
      const doc = new DOMParser().parseFromString(xml);
      let xpathExpr;

      if (category) {
        // VULNERABLE: XPath Injection — category interpolated directly
        // Payload: '] | //product | //product[category='
        // Payload: ' or '1'='1
        xpathExpr = `//product[category/text()='${category}']`;
      } else {
        xpathExpr = '//product[hidden/text()="0"]';
      }

      console.log(`[XML] XPath query: ${xpathExpr}`);

      const nodes = xpath.select(xpathExpr, doc);
      let resultXml = '<?xml version="1.0" encoding="UTF-8"?>\n<results>\n';

      nodes.forEach(node => {
        resultXml += '  ' + node.toString() + '\n';
      });

      resultXml += '</results>';

      res.type('application/xml').send(resultXml);
    } catch (err) {
      // VULNERABLE: XPath error messages returned
      res.status(500).type('application/xml').send(
        `<?xml version="1.0"?><error><message>${err.message}</message><xpath>${category}</xpath></error>`
      );
    }
  };

  if (productsXml) {
    processQuery(productsXml);
  } else {
    buildProductsXml((err, xml) => {
      if (err) return res.status(500).send('Failed to load products');
      processQuery(xml);
    });
  }
});

// POST /xml/partner-login — XPath Injection for authentication bypass
router.post('/partner-login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, error: 'Username and password required' });
  }

  try {
    const doc = new DOMParser().parseFromString(authXml);

    // VULNERABLE: XPath Injection — direct string interpolation
    // Payload: ' or '1'='1' or '1'='1   (for both fields)
    // This makes the query always true and returns the first partner
    const xpathExpr = `//partner[username/text()='${username}' and password/text()='${password}']`;

    console.log(`[XML] Partner auth XPath: ${xpathExpr}`);

    const nodes = xpath.select(xpathExpr, doc);

    if (nodes.length > 0) {
      const partner = nodes[0];
      const role = xpath.select('string(role)', partner);
      const apiKey = xpath.select('string(apiKey)', partner);
      const uname = xpath.select('string(username)', partner);

      res.json({
        success: true,
        message: 'Partner authenticated',
        partner: { username: uname, role: role, apiKey: apiKey }
      });
    } else {
      res.status(401).json({ success: false, error: 'Invalid partner credentials' });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
