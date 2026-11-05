// Template engine service — Nunjucks
// Used for email templates and invoice generation
// TODO: review autoescape settings before production
const nunjucks = require('nunjucks');
const path = require('path');

// Configure nunjucks for file-based templates
const env = nunjucks.configure(path.join(__dirname, '../templates'), {
  autoescape: false,  // VULNERABLE: autoescaping disabled globally
  throwOnUndefined: false,
  watch: true
});

// VULNERABLE: Server-Side Template Injection (SSTI)
// User input is concatenated INTO the template string itself,
// allowing injection of {{ }} expressions
function renderTemplate(templateString, context) {
  try {
    // VULNERABLE: user-controlled templateString is rendered directly
    // Payload: {{ range.constructor("return global.process.mainModule.require('child_process').execSync('whoami').toString()")() }}
    const output = nunjucks.renderString(templateString, context || {});
    return { success: true, output };
  } catch (err) {
    // VULNERABLE: error messages reveal internal paths and config
    return { success: false, error: err.message, stack: err.stack };
  }
}

// Slightly safer version — renders from a file, user input only as context
// But still vulnerable because autoescape is off
function renderFromFile(templateFile, context) {
  try {
    const output = nunjucks.render(templateFile, context || {});
    return { success: true, output };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// Preview template — used by seller dashboard
// VULNERABLE: passes seller-authored template string to renderString
function previewSellerTemplate(sellerTemplate, sampleData) {
  const defaults = {
    buyer_name: 'TestBuyer',
    product_name: 'Test Product',
    order_id: 'ORD-TEST-001',
    access_code: 'ACCESS-12345',
    seller_name: 'TestSeller',
    ...sampleData
  };
  return renderTemplate(sellerTemplate, defaults);
}

module.exports = { renderTemplate, renderFromFile, previewSellerTemplate, env };
