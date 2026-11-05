// SOAP Payment service — XML Injection, XXE
const express = require('express');
const router = express.Router();
const { DOMParser } = require('@xmldom/xmldom');

// POST /services/payment — XML Injection in SOAP envelope
router.post('/payment', express.text({ type: ['*/xml', 'text/xml', 'application/xml', 'application/soap+xml'] }), (req, res) => {
  const rawXml = req.body;

  if (!rawXml || typeof rawXml !== 'string') {
    return res.status(400).type('xml').send(
      '<?xml version="1.0"?><error>XML body required</error>'
    );
  }

  try {
    // VULNERABLE: XML parser configured to process external entities
    // This enables XXE (XML External Entity) attacks
    const doc = new DOMParser({
      errorHandler: {
        warning: () => {},
        error: (msg) => console.error('[XML] Parse error:', msg),
        fatalError: (msg) => console.error('[XML] Fatal:', msg)
      }
    }).parseFromString(rawXml);

    // Extract payment fields from SOAP body
    const getNodeText = (tagName) => {
      const nodes = doc.getElementsByTagName(tagName);
      return nodes.length > 0 ? nodes[0].textContent : '';
    };

    const itemName = getNodeText('itemName') || getNodeText('item');
    const amount = getNodeText('amount') || getNodeText('price');
    const buyerId = getNodeText('buyerId') || getNodeText('buyer');
    const paymentMethod = getNodeText('paymentMethod') || 'XMR';

    // VULNERABLE: User-supplied data reflected in response XML without encoding
    // Attacker can inject XML tags to alter the response structure
    const responseXml = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <PaymentResponse>
      <status>PROCESSED</status>
      <transactionId>TXN-${Date.now()}</transactionId>
      <item>${itemName}</item>
      <amount>${amount}</amount>
      <buyer>${buyerId}</buyer>
      <paymentMethod>${paymentMethod}</paymentMethod>
      <escrowStatus>HELD</escrowStatus>
      <timestamp>${new Date().toISOString()}</timestamp>
    </PaymentResponse>
  </soap:Body>
</soap:Envelope>`;

    res.type('application/xml').send(responseXml);
  } catch (err) {
    res.status(500).type('xml').send(
      `<?xml version="1.0"?><error><message>${err.message}</message></error>`
    );
  }
});

// POST /xml/import — XML Injection via product import
router.post('/import', express.text({ type: ['*/xml', 'text/xml', 'application/xml'] }), (req, res) => {
  const rawXml = req.body;

  if (!rawXml) {
    return res.status(400).json({ success: false, error: 'XML body required' });
  }

  try {
    // VULNERABLE: Parses XML with potential DTD processing
    const doc = new DOMParser().parseFromString(rawXml);
    const products = doc.getElementsByTagName('product');
    const imported = [];

    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      const getText = (tag) => {
        const nodes = product.getElementsByTagName(tag);
        return nodes.length > 0 ? nodes[0].textContent : '';
      };

      imported.push({
        name: getText('name'),
        category: getText('category'),
        price: parseFloat(getText('price')) || 0,
        description: getText('description'),
        tier: getText('tier') || 'TIER-B'
      });
    }

    // VULNERABLE: imported data stored without sanitization
    const { pool } = require('../config/database');
    let insertCount = 0;

    imported.forEach(p => {
      const productId = `HC-IMP-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
      // VULNERABLE: SQL Injection via XML field values
      const query = `INSERT INTO products (product_id, name, category, tier, price, description, seller_id) 
                     VALUES ('${productId}', '${p.name}', '${p.category}', '${p.tier}', ${p.price}, '${p.description}', ${req.session?.userId || 0})`;
      pool.query(query, () => { insertCount++; });
    });

    res.json({
      success: true,
      message: `${imported.length} products imported`,
      products: imported
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message, stack: err.stack });
  }
});

// GET /services/payment/wsdl — Expose WSDL
router.get('/payment', (req, res) => {
  if (req.query.wsdl !== undefined) {
    res.type('xml').send(`<?xml version="1.0" encoding="UTF-8"?>
<definitions name="HellCorpPayment"
  targetNamespace="http://hellcorp.onion/payment"
  xmlns="http://schemas.xmlsoap.org/wsdl/"
  xmlns:soap="http://schemas.xmlsoap.org/wsdl/soap/"
  xmlns:tns="http://hellcorp.onion/payment"
  xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  
  <message name="PaymentRequest">
    <part name="itemName" type="xsd:string"/>
    <part name="amount" type="xsd:decimal"/>
    <part name="buyerId" type="xsd:string"/>
    <part name="paymentMethod" type="xsd:string"/>
  </message>
  
  <message name="PaymentResponse">
    <part name="status" type="xsd:string"/>
    <part name="transactionId" type="xsd:string"/>
  </message>
  
  <portType name="PaymentPortType">
    <operation name="ProcessPayment">
      <input message="tns:PaymentRequest"/>
      <output message="tns:PaymentResponse"/>
    </operation>
  </portType>
  
  <binding name="PaymentBinding" type="tns:PaymentPortType">
    <soap:binding style="rpc" transport="http://schemas.xmlsoap.org/soap/http"/>
    <operation name="ProcessPayment">
      <soap:operation soapAction="ProcessPayment"/>
    </operation>
  </binding>
  
  <service name="HellCorpPaymentService">
    <port name="PaymentPort" binding="tns:PaymentBinding">
      <soap:address location="http://localhost:3000/services/payment"/>
    </port>
  </service>
</definitions>`);
  } else {
    res.json({ service: 'HellCorp Payment Gateway', wsdl: '/services/payment?wsdl' });
  }
});

module.exports = router;
