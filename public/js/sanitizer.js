// HellCorp HTML Sanitizer
// "Good enough" sanitizer for user-generated content
// TODO: Replace with DOMPurify before launch

// VULNERABLE: Regex-based sanitizer — inherently bypassable
// Only strips lowercase <script> tags and a few event handlers
function sanitizeHTML(html) {
  if (!html || typeof html !== 'string') return '';

  let clean = html;

  // Strip <script> tags — CASE SENSITIVE ONLY (bypassed by <Script>, <SCRIPT>, etc.)
  clean = clean.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Strip common event handlers — ONLY lowercase
  clean = clean.replace(/\s+onclick\s*=/gi, ' data-removed=');
  clean = clean.replace(/\s+onload\s*=/gi, ' data-removed=');
  clean = clean.replace(/\s+onerror\s*=/gi, ' data-removed=');

  // VULNERABLE: Does NOT strip:
  // - <svg>, <math>, <style>, <img>, <iframe>, <object>, <embed>, <details>, <video>, <audio>
  // - onmouseover, onfocus, onblur, onmouseenter, ontoggle, onpointerover
  // - <svg/onload=...>, <math><mtext><table><mglyph><style>...
  // - Mutation XSS: <svg><p><style><img src=x onerror=alert(1)>

  // VULNERABLE: Does not handle attribute injection
  // Example bypass: <img src=x onerror="alert(1)"> (when onerror regex doesn't match)
  // Example bypass: <svg onload="alert(1)"> (svg not stripped)
  // Example bypass: <details ontoggle="alert(1)" open> (ontoggle not stripped)
  // Example bypass: <math><mtext><table><mglyph><style><!--</style><img src=x onerror=alert(1)>

  return clean;
}

// Basic HTML entity escaping — used in SOME places but not consistently
function escapeHTML(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Make globally available
window.sanitizeHTML = sanitizeHTML;
window.escapeHTML = escapeHTML;
