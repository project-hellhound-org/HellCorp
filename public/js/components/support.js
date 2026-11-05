// Support Component — Ticket submission, Reports, Feedback
// Vulnerabilities: Blind XSS (ticket descriptions viewed by admin)

function renderSupport() {
  const root = document.getElementById('app-root');
  root.innerHTML = `
    <div class="animate-in">
      <div class="section-header mb-24"><h1 class="section-title">SUPPORT CENTER</h1><span class="section-subtitle">ENCRYPTED SUPPORT CHANNEL</span></div>

      <div class="tabs">
        <button class="tab active" onclick="switchSupportTab('tickets',this)">MY TICKETS</button>
        <button class="tab" onclick="switchSupportTab('create',this)">NEW TICKET</button>
        <button class="tab" onclick="switchSupportTab('report',this)">REPORT</button>
        <button class="tab" onclick="switchSupportTab('feedback',this)">FEEDBACK</button>
        <button class="tab" onclick="switchSupportTab('contact',this)">CONTACT SELLER</button>
      </div>

      <div id="support-tab-content"></div>
    </div>
  `;
  loadSupportTickets();
}

function switchSupportTab(tab, btn) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  ({tickets: loadSupportTickets, create: loadCreateTicket, report: loadReportForm, feedback: loadFeedbackForm, contact: loadContactSeller})[tab]?.();
}

async function loadSupportTickets() {
  const data = await fetchAPI('/support/tickets');
  const tickets = data.tickets || [];
  document.getElementById('support-tab-content').innerHTML = tickets.length === 0
    ? '<div class="empty-state mt-24"><div class="empty-state-icon">🎫</div><div class="empty-state-text">No tickets yet</div></div>'
    : `<div class="card mt-16"><div class="card-body"><ul class="ticket-list">
      ${tickets.map(t => `
        <li class="ticket-item">
          <div class="flex-between">
            <div>
              <strong class="text-sm">${t.subject || '(no subject)'}</strong>
              <span class="ticket-status ${t.status === 'open' ? 'open' : 'closed'}" style="margin-left:8px;">${t.status || 'open'}</span>
            </div>
            <span class="text-muted text-xs">${new Date(t.created_at).toLocaleDateString()}</span>
          </div>
          <p class="text-off text-xs mt-4">${t.description || ''}</p>
        </li>
      `).join('')}
    </ul></div></div>`;
}

function loadCreateTicket() {
  document.getElementById('support-tab-content').innerHTML = `
    <div class="card mt-16"><div class="card-body">
      <h3 class="text-brutal text-red mb-16" style="font-size:16px;">CREATE SUPPORT TICKET</h3>
      <div class="form-group"><label class="form-label">SUBJECT</label><input type="text" id="ticket-subject" class="form-input" placeholder="Brief summary of issue"></div>
      <div class="form-group"><label class="form-label">CATEGORY</label>
        <select id="ticket-category" class="form-select">
          <option value="order">Order Issue</option>
          <option value="account">Account Problem</option>
          <option value="delivery">Delivery Issue</option>
          <option value="payment">Payment Issue</option>
          <option value="other">Other</option>
        </select>
      </div>
      <div class="form-group"><label class="form-label">DESCRIPTION</label>
        <textarea id="ticket-description" class="form-textarea" placeholder="Detailed description of your issue... (HTML formatting supported)"></textarea>
        <span class="form-hint">HTML formatting is accepted for rich descriptions</span>
      </div>
      <button class="btn btn-primary" onclick="submitTicket()">SUBMIT TICKET</button>
      <div id="ticket-result" class="mt-16"></div>
    </div></div>
  `;
}

async function submitTicket() {
  const data = await fetchAPI('/support/ticket', { method: 'POST', body: {
    subject: document.getElementById('ticket-subject').value,
    category: document.getElementById('ticket-category').value,
    description: document.getElementById('ticket-description').value
  }});
  document.getElementById('ticket-result').innerHTML = data.success
    ? '<div class="text-green text-sm">Ticket submitted — our team will review it shortly.</div>'
    : '<div class="text-red text-sm">' + (data.error || 'Failed') + '</div>';
  if (data.success) showToast('Support ticket created', 'success');
}

function loadReportForm() {
  document.getElementById('support-tab-content').innerHTML = `
    <div class="card mt-16"><div class="card-body">
      <h3 class="text-brutal text-red mb-16" style="font-size:16px;">REPORT USER / LISTING</h3>
      <div class="form-group"><label class="form-label">REPORT TYPE</label>
        <select id="report-type" class="form-select">
          <option value="scam">Scam / Fraud</option>
          <option value="fake">Fake Product</option>
          <option value="abuse">Abusive Seller</option>
          <option value="other">Other</option>
        </select>
      </div>
      <div class="form-group"><label class="form-label">TARGET USER / PRODUCT</label><input type="text" id="report-target" class="form-input" placeholder="Username or product ID"></div>
      <div class="form-group"><label class="form-label">REASON</label><textarea id="report-reason" class="form-textarea" placeholder="Detailed reason for report..."></textarea></div>
      <button class="btn btn-primary" onclick="submitReport()">SUBMIT REPORT</button>
      <div id="report-result" class="mt-16"></div>
    </div></div>
  `;
}

async function submitReport() {
  const data = await fetchAPI('/support/report', { method: 'POST', body: {
    type: document.getElementById('report-type').value,
    target: document.getElementById('report-target').value,
    reason: document.getElementById('report-reason').value
  }});
  document.getElementById('report-result').innerHTML = data.success
    ? '<div class="text-green text-sm">Report submitted for review.</div>'
    : '<div class="text-red text-sm">' + (data.error || 'Failed') + '</div>';
}

function loadFeedbackForm() {
  document.getElementById('support-tab-content').innerHTML = `
    <div class="card mt-16"><div class="card-body">
      <h3 class="text-brutal text-red mb-16" style="font-size:16px;">FEEDBACK</h3>
      <div class="form-group"><label class="form-label">YOUR FEEDBACK</label><textarea id="feedback-message" class="form-textarea" placeholder="Tell us how we can improve..."></textarea></div>
      <div class="form-group"><label class="form-label">RATING</label>
        <select id="feedback-rating" class="form-select">
          <option value="5">★★★★★ Excellent</option><option value="4">★★★★☆ Good</option>
          <option value="3">★★★☆☆ Average</option><option value="2">★★☆☆☆ Poor</option>
          <option value="1">★☆☆☆☆ Terrible</option>
        </select>
      </div>
      <button class="btn btn-primary" onclick="submitFeedback()">SUBMIT FEEDBACK</button>
      <div id="feedback-result" class="mt-16"></div>
    </div></div>
  `;
}

async function submitFeedback() {
  const data = await fetchAPI('/support/feedback', { method: 'POST', body: {
    message: document.getElementById('feedback-message').value,
    rating: document.getElementById('feedback-rating').value
  }});
  document.getElementById('feedback-result').innerHTML = data.success
    ? '<div class="text-green text-sm">Thank you for your feedback.</div>'
    : '<div class="text-red text-sm">' + (data.error || 'Failed') + '</div>';
}

function loadContactSeller() {
  document.getElementById('support-tab-content').innerHTML = `
    <div class="card mt-16"><div class="card-body">
      <h3 class="text-brutal text-red mb-16" style="font-size:16px;">CONTACT SELLER</h3>
      <div class="form-group"><label class="form-label">SELLER ID</label><input type="number" id="contact-seller-id" class="form-input" placeholder="Seller user ID"></div>
      <div class="form-group"><label class="form-label">YOUR EMAIL</label><input type="text" id="contact-from" class="form-input" placeholder="your@email.onion"></div>
      <div class="form-group"><label class="form-label">SUBJECT</label><input type="text" id="contact-subject" class="form-input" placeholder="Subject line"></div>
      <div class="form-group"><label class="form-label">MESSAGE</label><textarea id="contact-message" class="form-textarea" placeholder="Your message to the seller..."></textarea></div>
      <button class="btn btn-primary" onclick="contactSeller()">SEND MESSAGE</button>
      <div id="contact-result" class="mt-16"></div>
    </div></div>
  `;
}

async function contactSeller() {
  const data = await fetchAPI('/contact-seller', { method: 'POST', body: {
    seller_id: document.getElementById('contact-seller-id').value,
    from_email: document.getElementById('contact-from').value,
    subject: document.getElementById('contact-subject').value,
    message: document.getElementById('contact-message').value
  }});
  document.getElementById('contact-result').innerHTML = data.success
    ? '<div class="text-green text-sm">Message sent to seller.</div>'
    : '<div class="text-red text-sm">' + (data.error || 'Failed') + '</div>';
}
