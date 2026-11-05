// Messaging Component — Stored XSS, Mutation XSS, DOM XSS via postMessage

async function renderMessaging() {
  if (!state.user) { router.navigate('/login'); return; }
  const root = document.getElementById('app-root');
  root.innerHTML = `
    <div class="animate-in">
      <div class="section-header mb-24"><h1 class="section-title">MESSAGES</h1>
        <button class="btn btn-sm btn-primary" onclick="showComposeForm()">COMPOSE</button>
      </div>
      <div class="tabs">
        <button class="tab active" onclick="loadInbox(this)">INBOX</button>
        <button class="tab" onclick="loadSent(this)">SENT</button>
      </div>
      <div id="msg-content"><div class="loading-text">Loading...<span class="cursor">_</span></div></div>
    </div>
  `;
  loadInbox(document.querySelector('.tab.active'));
}

async function loadInbox(btn) {
  if(btn){document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));btn.classList.add('active');}
  const data = await fetchAPI('/messages/inbox');
  document.getElementById('msg-content').innerHTML = (data.messages||[]).length === 0
    ? '<div class="empty-state"><div class="empty-state-icon">📭</div><div class="empty-state-text">No messages</div></div>'
    : `<ul class="message-list">${(data.messages||[]).map(m => `
      <li class="message-item ${m.is_read?'':'unread'}" onclick="viewMessage(${m.id})">
        <span class="message-sender">${m.sender_name||'Unknown'}</span>
        <span class="message-subject">${m.subject||'(no subject)'}</span>
        <span class="message-date">${new Date(m.created_at).toLocaleDateString()}</span>
      </li>`).join('')}</ul>`;
}

async function loadSent(btn) {
  if(btn){document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));btn.classList.add('active');}
  const data = await fetchAPI('/messages/sent');
  document.getElementById('msg-content').innerHTML = (data.messages||[]).length === 0
    ? '<div class="empty-state"><div class="empty-state-icon">📤</div><div class="empty-state-text">No sent messages</div></div>'
    : `<ul class="message-list">${(data.messages||[]).map(m => `
      <li class="message-item" onclick="viewMessage(${m.id})">
        <span class="message-sender">To: ${m.recipient_name||'Unknown'}</span>
        <span class="message-subject">${m.subject||'(no subject)'}</span>
        <span class="message-date">${new Date(m.created_at).toLocaleDateString()}</span>
      </li>`).join('')}</ul>`;
}

async function viewMessage(id) {
  const data = await fetchAPI('/messages/' + id);
  if (!data.success) return showToast(data.error, 'error');
  const m = data.message;
  document.getElementById('msg-content').innerHTML = `
    <div class="message-view">
      <button class="btn btn-sm btn-secondary mb-16" onclick="renderMessaging()">← BACK</button>
      <div class="message-view-header">
        <div class="flex-between">
          <div><strong class="text-white">${m.sender_name||'Unknown'}</strong> <span class="text-muted text-xs">${m.sender_nickname||''}</span></div>
          <span class="text-muted text-xs">${new Date(m.created_at).toLocaleString()}</span>
        </div>
        <h3 class="text-brutal mt-8" style="font-size:18px;">${m.subject||'(no subject)'}</h3>
      </div>
      <!-- VULNERABLE: Stored XSS + Mutation XSS — message body rendered with innerHTML -->
      <div class="message-view-body">${sanitizeHTML(m.body)}</div>
      <div class="mt-24" style="border-top:1px solid var(--edge);padding-top:16px;">
        <button class="btn btn-sm btn-secondary" onclick="replyTo('${(m.sender_name||'').replace(/'/g,"\\'")}')">REPLY</button>
        <button class="btn btn-sm btn-danger" onclick="deleteMessage(${m.id})">DELETE</button>
      </div>
    </div>
  `;
}

async function deleteMessage(id) {
  await fetchAPI('/messages/' + id, { method: 'DELETE' });
  showToast('Message deleted', 'success');
  renderMessaging();
}

function replyTo(username) {
  showComposeForm(username);
}

async function showComposeForm(recipient) {
  const usersData = await fetchAPI('/messages/users');
  const users = usersData.users || [];
  document.getElementById('msg-content').innerHTML = `
    <div class="card"><div class="card-body">
      <h3 class="text-brutal text-red mb-16" style="font-size:18px;">COMPOSE MESSAGE</h3>
      <div class="form-group"><label class="form-label">RECIPIENT</label>
        <select id="msg-recipient" class="form-select">
          ${users.map(u => `<option value="${u.username}" ${u.username===recipient?'selected':''}>${u.username} (${u.role})</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label class="form-label">SUBJECT</label><input type="text" id="msg-subject" class="form-input" placeholder="Subject"></div>
      <div class="form-group">
        <label class="form-label">MESSAGE BODY</label>
        <div class="flex gap-8 mb-8">
          <button class="btn btn-sm btn-secondary" onclick="toggleRichText(false)" id="mode-plain">PLAIN TEXT</button>
          <button class="btn btn-sm btn-secondary" onclick="toggleRichText(true)" id="mode-rich">RICH TEXT (HTML)</button>
        </div>
        <textarea id="msg-body" class="form-textarea" style="min-height:200px;" placeholder="Write your message..."></textarea>
      </div>
      <button class="btn btn-primary" onclick="sendMessage()">SEND MESSAGE</button>
    </div></div>
  `;
}

let richTextMode = false;
function toggleRichText(rich) {
  richTextMode = rich;
  document.getElementById('mode-plain').style.borderColor = rich ? 'var(--edge)' : 'var(--red)';
  document.getElementById('mode-rich').style.borderColor = rich ? 'var(--red)' : 'var(--edge)';
}

async function sendMessage() {
  let body = document.getElementById('msg-body').value;
  // In rich text mode, the weak sanitizer is applied — but it's bypassable
  if (richTextMode) body = sanitizeHTML(body);
  const data = await fetchAPI('/messages/send', { method: 'POST', body: {
    recipient: document.getElementById('msg-recipient').value,
    subject: document.getElementById('msg-subject').value,
    body: body
  }});
  if (data.success) { showToast('Message sent', 'success'); renderMessaging(); }
  else showToast(data.error || 'Send failed', 'error');
}
