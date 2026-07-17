/**
 * Email toolbar widget + template builder modal (ported from web/EmailTemplateBuilder).
 */

const MAX_FILE_SIZE_MB = 35;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

function stripHtml(html) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return (tmp.textContent || tmp.innerText || '').trim();
}

function getSendEmailEndpoint() {
  const env = typeof import.meta !== 'undefined' ? import.meta.env : {};
  if (env.VITE_SEND_EMAIL_ENDPOINT) return env.VITE_SEND_EMAIL_ENDPOINT;
  if (typeof window !== 'undefined') return `${window.location.origin}/api/send-email`;
  return '/api/send-email';
}

async function sendEmail(payload) {
  const endpoint = getSendEmailEndpoint();
  let res;
  try {
    res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Network error';
    return { success: false, message: `Cannot reach the backend. (${msg})` };
  }

  const text = await res.text().catch(() => '');
  let data = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = {};
    }
  }

  if (res.status === 404) {
    return {
      success: false,
      message: 'Send-email is not enabled on this server. Configure SENDGRID_API_KEY and POST /api/send-email.',
    };
  }

  if (!res.ok) {
    return {
      success: false,
      message: data.message?.trim() || text.slice(0, 200) || `Server returned ${res.status}`,
    };
  }

  return { success: true, message: data.message || 'Email sent successfully' };
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      const base64 = typeof result === 'string' && result.includes(',')
        ? result.split(',')[1]
        : String(result || '');
      resolve(base64 || '');
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function readFormState(modal) {
  return {
    to: modal.querySelector('#email-to')?.value || '',
    cc: modal.querySelector('#email-cc')?.value || '',
    bcc: modal.querySelector('#email-bcc')?.value || '',
    subject: modal.querySelector('#email-subject')?.value || '',
    bodyHtml: modal.querySelector('#email-body')?.value || '',
    attachments: modal._attachments || [],
  };
}

function renderAttachmentList(modal) {
  const list = modal.querySelector('#email-attachments-list');
  if (!list) return;
  const attachments = modal._attachments || [];
  list.innerHTML = attachments
    .map(
      (a) =>
        `<li><span>${escapeHtml(a.file.name)}</span> <span class="muted">(${(a.file.size / 1024).toFixed(1)} KB)</span> <button type="button" data-id="${a.id}" class="email-remove-attachment">Remove</button></li>`
    )
    .join('');
  list.querySelectorAll('.email-remove-attachment').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      modal._attachments = (modal._attachments || []).filter((a) => a.id !== id);
      renderAttachmentList(modal);
    });
  });
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function setSendStatus(modal, type, message) {
  const el = modal.querySelector('#email-send-status');
  if (!el) return;
  el.classList.remove('hidden', 'success', 'error');
  el.classList.add(type === 'success' ? 'success' : 'error');
  el.textContent = message;
}

function clearSendStatus(modal) {
  const el = modal.querySelector('#email-send-status');
  if (!el) return;
  el.classList.add('hidden');
  el.textContent = '';
}

function openEmailModal(modal, popup, btn) {
  popup?.classList.add('hidden');
  btn?.setAttribute('aria-expanded', 'false');
  modal.classList.remove('hidden');
  modal.querySelector('#email-to')?.focus();
}

function closeEmailModal(modal) {
  modal.classList.add('hidden');
  clearSendStatus(modal);
}

function bindEmailModal(modal) {
  modal._attachments = [];

  modal.querySelector('#email-close')?.addEventListener('click', () => closeEmailModal(modal));
  modal.querySelector('#email-backdrop')?.addEventListener('click', () => closeEmailModal(modal));

  modal.querySelector('#email-tab-compose')?.addEventListener('click', () => {
    modal.querySelector('#email-tab-compose')?.classList.add('active');
    modal.querySelector('#email-tab-preview')?.classList.remove('active');
    modal.querySelector('#email-compose-pane')?.classList.remove('hidden');
    modal.querySelector('#email-preview-pane')?.classList.add('hidden');
  });

  modal.querySelector('#email-tab-preview')?.addEventListener('click', () => {
    const state = readFormState(modal);
    modal.querySelector('#email-tab-preview')?.classList.add('active');
    modal.querySelector('#email-tab-compose')?.classList.remove('active');
    modal.querySelector('#email-compose-pane')?.classList.add('hidden');
    modal.querySelector('#email-preview-pane')?.classList.remove('hidden');
    modal.querySelector('#email-preview-meta').innerHTML =
      `<p>To: ${escapeHtml(state.to || '(not set)')}</p><p>Subject: ${escapeHtml(state.subject || '(no subject)')}</p>`;
    modal.querySelector('#email-preview-body').innerHTML = state.bodyHtml || '<p>(empty)</p>';
  });

  modal.querySelector('#email-add-files')?.addEventListener('click', () => {
    modal.querySelector('#email-file-input')?.click();
  });

  modal.querySelector('#email-file-input')?.addEventListener('change', (event) => {
    const files = event.target.files;
    if (!files?.length) return;
    const errorEl = modal.querySelector('#email-file-error');
    const oversized = Array.from(files).filter((f) => f.size > MAX_FILE_SIZE_BYTES);
    if (oversized.length) {
      if (errorEl) {
        errorEl.textContent = `File too large (max ${MAX_FILE_SIZE_MB} MB per file).`;
        errorEl.classList.remove('hidden');
      }
      event.target.value = '';
      return;
    }
    if (errorEl) errorEl.classList.add('hidden');
    const next = Array.from(files).map((file) => ({
      file,
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    }));
    modal._attachments = [...(modal._attachments || []), ...next];
    renderAttachmentList(modal);
    event.target.value = '';
  });

  modal.querySelector('#email-copy-plain')?.addEventListener('click', async () => {
    const state = readFormState(modal);
    const text = `Subject: ${state.subject}\n\n${stripHtml(state.bodyHtml)}`;
    try {
      await navigator.clipboard.writeText(text);
      setSendStatus(modal, 'success', 'Subject and plain text copied to clipboard.');
    } catch {
      setSendStatus(modal, 'error', 'Could not copy to clipboard.');
    }
  });

  modal.querySelector('#email-mailto')?.addEventListener('click', () => {
    const state = readFormState(modal);
    const plain = stripHtml(state.bodyHtml);
    const to = encodeURIComponent(state.to.trim());
    const subj = encodeURIComponent(state.subject);
    const body = encodeURIComponent(plain);
    let mailto = `mailto:${state.to.trim() || ''}`;
    const params = [];
    if (state.subject) params.push(`subject=${subj}`);
    if (plain) params.push(`body=${body}`);
    if (params.length) mailto += `?${params.join('&')}`;
    window.location.href = mailto;
    if (state.attachments.length) {
      setTimeout(() => {
        setSendStatus(
          modal,
          'success',
          `Email client opened. Attach ${state.attachments.length} file(s) manually if needed.`
        );
      }, 300);
    }
  });

  modal.querySelector('#email-send')?.addEventListener('click', async () => {
    const state = readFormState(modal);
    const toList = state.to.split(',').map((e) => e.trim()).filter(Boolean);
    if (!toList.length) {
      setSendStatus(modal, 'error', 'Please enter at least one recipient (To).');
      return;
    }
    if (!state.subject.trim()) {
      setSendStatus(modal, 'error', 'Please enter a subject.');
      return;
    }

    const sendBtn = modal.querySelector('#email-send');
    sendBtn.disabled = true;
    sendBtn.textContent = 'Sending…';
    clearSendStatus(modal);

    try {
      const attachments = [];
      for (const a of state.attachments) {
        attachments.push({ filename: a.file.name, content: await fileToBase64(a.file) });
      }
      const result = await sendEmail({
        to: toList,
        cc: state.cc.trim() || undefined,
        bcc: state.bcc.trim() || undefined,
        subject: state.subject.trim(),
        html: state.bodyHtml,
        text: stripHtml(state.bodyHtml),
        attachments: attachments.length ? attachments : undefined,
      });
      setSendStatus(modal, result.success ? 'success' : 'error', result.message);
    } catch (err) {
      setSendStatus(modal, 'error', err instanceof Error ? err.message : 'Failed to send email.');
    } finally {
      sendBtn.disabled = false;
      sendBtn.textContent = 'Send email';
    }
  });
}

/**
 * Toolbar email icon → popup → compose modal (same flow as web Contact Us email builder).
 */
export function initEmailWidget() {
  const btn = document.getElementById('btn-email');
  const popup = document.getElementById('email-popup');
  const openBtn = document.getElementById('email-open-compose');
  const modal = document.getElementById('email-modal');
  if (!btn || !popup || !openBtn || !modal) return;

  bindEmailModal(modal);

  const defaultTo =
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_CONTACT_EMAIL) || '';
  const toInput = modal.querySelector('#email-to');
  if (toInput && defaultTo) toInput.placeholder = defaultTo;

  const closePopup = () => {
    popup.classList.add('hidden');
    btn.setAttribute('aria-expanded', 'false');
  };

  btn.addEventListener('click', (event) => {
    event.stopPropagation();
    const open = popup.classList.toggle('hidden') === false;
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  });

  openBtn.addEventListener('click', () => openEmailModal(modal, popup, btn));

  document.addEventListener('click', (event) => {
    if (
      !popup.classList.contains('hidden') &&
      !btn.contains(event.target) &&
      !popup.contains(event.target)
    ) {
      closePopup();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !modal.classList.contains('hidden')) {
      closeEmailModal(modal);
    }
  });
}
