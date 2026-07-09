/**
 * PBMP Traceability
 * Requirement: REQ-SALES-001
 * Acceptance Criteria: AC-REQ-SALES-001-1
 */
import { api } from './api.js';

const state = {
  leads: [],
  tasks: [],
  notifications: [],
  audit: [],
  users: [],
  selectedLeadId: null,
  editingLeadId: null,
};

const els = {
  leadsList: document.getElementById('leads-list'),
  leadDetail: document.getElementById('lead-detail'),
  detailTitle: document.getElementById('detail-title'),
  tasksList: document.getElementById('tasks-list'),
  notificationsList: document.getElementById('notifications-list'),
  auditList: document.getElementById('audit-list'),
  statsBar: document.getElementById('stats-bar'),
  dialog: document.getElementById('lead-dialog'),
  form: document.getElementById('lead-form'),
  dialogTitle: document.getElementById('dialog-title'),
  assignedSelect: document.getElementById('assigned-to-select'),
  toast: document.getElementById('toast'),
};

function showToast(message, type = '') {
  els.toast.textContent = message;
  els.toast.className = `toast ${type}`;
  els.toast.classList.add('visible');
  setTimeout(() => els.toast.classList.remove('visible'), 3500);
}

function scoreClass(score) {
  if (score > 80) return 'score-high';
  if (score >= 50) return 'score-mid';
  return 'score-low';
}

function formatDate(iso) {
  return new Date(iso).toLocaleString();
}

function renderStats() {
  const highScore = state.leads.filter((l) => l.lead_score > 80).length;
  const openTasks = state.tasks.filter((t) => t.status === 'open').length;
  const unread = state.notifications.filter((n) => !n.read).length;
  els.statsBar.innerHTML = `
    <div class="stat"><span class="stat-value">${state.leads.length}</span><span class="stat-label">Leads</span></div>
    <div class="stat"><span class="stat-value">${highScore}</span><span class="stat-label">High Score (&gt;80)</span></div>
    <div class="stat"><span class="stat-value">${openTasks}</span><span class="stat-label">Open Tasks</span></div>
    <div class="stat"><span class="stat-value">${unread}</span><span class="stat-label">Unread Alerts</span></div>
  `;
}

function renderLeadsList() {
  if (state.leads.length === 0) {
    els.leadsList.innerHTML = '<p class="placeholder">No leads yet. Create your first lead.</p>';
    return;
  }

  els.leadsList.innerHTML = state.leads
    .map(
      (lead) => `
    <button type="button" class="list-item ${lead.id === state.selectedLeadId ? 'selected' : ''}" data-id="${lead.id}">
      <div class="list-item-main">
        <strong>${escapeHtml(lead.name)}</strong>
        <span class="muted">${escapeHtml(lead.company || lead.email)}</span>
      </div>
      <span class="score-badge ${scoreClass(lead.lead_score)}">${lead.lead_score}</span>
    </button>
  `,
    )
    .join('');

  els.leadsList.querySelectorAll('.list-item').forEach((btn) => {
    btn.addEventListener('click', () => selectLead(btn.dataset.id));
  });
}

function renderLeadDetail() {
  const lead = state.leads.find((l) => l.id === state.selectedLeadId);
  if (!lead) {
    els.detailTitle.textContent = 'Lead Details';
    els.leadDetail.innerHTML = '<p class="placeholder">Select a lead or create a new one.</p>';
    return;
  }

  els.detailTitle.textContent = lead.name;
  const assignee = state.users.find((u) => u.id === lead.assigned_to);

  els.leadDetail.innerHTML = `
    <dl class="detail-grid">
      <dt>Email</dt><dd>${escapeHtml(lead.email)}</dd>
      <dt>Company</dt><dd>${escapeHtml(lead.company || '—')}</dd>
      <dt>Status</dt><dd><span class="status-pill">${escapeHtml(lead.status)}</span></dd>
      <dt>Assigned To</dt><dd>${escapeHtml(assignee?.name || 'Unassigned')}</dd>
      <dt>Lead Score</dt>
      <dd>
        <div class="score-control">
          <input type="range" id="score-slider" min="0" max="100" value="${lead.lead_score}" />
          <output id="score-output" class="score-badge ${scoreClass(lead.lead_score)}">${lead.lead_score}</output>
        </div>
        <p class="hint">Updating score above 80 triggers REQ-SALES-001 follow-up workflow.</p>
      </dd>
      <dt>Updated</dt><dd>${formatDate(lead.updated_at)}</dd>
    </dl>
    <div class="detail-actions">
      <button type="button" id="btn-edit-lead" class="btn">Edit</button>
      <button type="button" id="btn-delete-lead" class="btn danger">Delete</button>
    </div>
  `;

  const slider = document.getElementById('score-slider');
  const output = document.getElementById('score-output');
  let debounceTimer;

  slider.addEventListener('input', () => {
    output.textContent = slider.value;
    output.className = `score-badge ${scoreClass(Number(slider.value))}`;
  });

  slider.addEventListener('change', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => updateScore(lead.id, Number(slider.value)), 200);
  });

  document.getElementById('btn-edit-lead').addEventListener('click', () => openDialog(lead));
  document.getElementById('btn-delete-lead').addEventListener('click', () => deleteLead(lead.id));
}

function renderTasks() {
  const items = state.selectedLeadId
    ? state.tasks.filter((t) => t.lead_id === state.selectedLeadId)
    : state.tasks;

  if (items.length === 0) {
    els.tasksList.innerHTML = '<p class="placeholder">No tasks yet.</p>';
    return;
  }

  els.tasksList.innerHTML = items
    .map(
      (task) => `
    <div class="list-row">
      <div>
        <strong>${escapeHtml(task.title)}</strong>
        <span class="muted">${escapeHtml(task.assigned_role)} · ${formatDate(task.created_at)}</span>
      </div>
      <span class="status-pill">${escapeHtml(task.status)}</span>
    </div>
  `,
    )
    .join('');
}

function renderNotifications() {
  if (state.notifications.length === 0) {
    els.notificationsList.innerHTML = '<p class="placeholder">No notifications.</p>';
    return;
  }

  els.notificationsList.innerHTML = state.notifications
    .slice(0, 20)
    .map(
      (n) => `
    <div class="list-row ${n.read ? '' : 'unread'}">
      <div>
        <strong>${escapeHtml(n.message)}</strong>
        <span class="muted">${escapeHtml(n.role)} · ${formatDate(n.created_at)}</span>
      </div>
    </div>
  `,
    )
    .join('');
}

function renderAudit() {
  if (state.audit.length === 0) {
    els.auditList.innerHTML = '<p class="placeholder">No audit entries.</p>';
    return;
  }

  els.auditList.innerHTML = state.audit
    .slice(0, 30)
    .map(
      (entry) => `
    <div class="list-row">
      <div>
        <strong>${escapeHtml(entry.action)}</strong>
        <span class="muted">${escapeHtml(entry.entity_type)} · ${formatDate(entry.created_at)}</span>
      </div>
      <span class="req-tag">${escapeHtml(entry.requirement_id)}</span>
    </div>
  `,
    )
    .join('');
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function refreshAll() {
  const [leadsRes, tasksRes, notifRes, auditRes, usersRes] = await Promise.all([
    api.getLeads(),
    api.getTasks(),
    api.getNotifications(),
    api.getAudit({ requirement_id: 'REQ-SALES-001' }),
    api.getUsers(),
  ]);
  state.leads = leadsRes.leads;
  state.tasks = tasksRes.tasks;
  state.notifications = notifRes.notifications;
  state.audit = auditRes.audit_log;
  state.users = usersRes.users;
  renderStats();
  renderLeadsList();
  renderLeadDetail();
  renderTasks();
  renderNotifications();
  renderAudit();
}

function selectLead(id) {
  state.selectedLeadId = id;
  renderLeadsList();
  renderLeadDetail();
  renderTasks();
}

function populateUserSelect() {
  els.assignedSelect.innerHTML =
    '<option value="">Unassigned</option>' +
    state.users.map((u) => `<option value="${u.id}">${escapeHtml(u.name)} (${escapeHtml(u.role)})</option>`).join('');
}

function openDialog(lead = null) {
  state.editingLeadId = lead?.id || null;
  els.dialogTitle.textContent = lead ? 'Edit Lead' : 'New Lead';
  els.form.name.value = lead?.name || '';
  els.form.email.value = lead?.email || '';
  els.form.company.value = lead?.company || '';
  els.form.lead_score.value = lead?.lead_score ?? 0;
  els.form.assigned_to.value = lead?.assigned_to || '';
  els.dialog.showModal();
}

async function saveLead(event) {
  event.preventDefault();
  const body = {
    name: els.form.name.value.trim(),
    email: els.form.email.value.trim(),
    company: els.form.company.value.trim(),
    lead_score: Number(els.form.lead_score.value),
    assigned_to: els.form.assigned_to.value || null,
  };

  try {
    let result;
    if (state.editingLeadId) {
      result = await api.updateLead(state.editingLeadId, body);
      showToast('Lead updated', 'ok');
    } else {
      result = await api.createLead(body);
      state.selectedLeadId = result.lead.id;
      showToast('Lead created', 'ok');
    }

    if (result.rule_result?.triggered) {
      showToast('REQ-SALES-001 triggered: task created & manager notified', 'ok');
    }

    els.dialog.close();
    await refreshAll();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function updateScore(id, score) {
  try {
    const result = await api.updateScore(id, score);
    const lead = result.lead;
    const idx = state.leads.findIndex((l) => l.id === id);
    if (idx >= 0) state.leads[idx] = lead;
    renderLeadsList();
    renderLeadDetail();

    if (result.rule_result?.triggered) {
      showToast('High-score follow-up task created for Sales Manager', 'ok');
      await refreshAll();
    } else {
      renderStats();
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteLead(id) {
  if (!confirm('Delete this lead?')) return;
  try {
    await api.deleteLead(id);
    if (state.selectedLeadId === id) state.selectedLeadId = null;
    showToast('Lead deleted', 'ok');
    await refreshAll();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

document.getElementById('btn-new-lead').addEventListener('click', () => openDialog());
document.getElementById('btn-cancel').addEventListener('click', () => els.dialog.close());
els.form.addEventListener('submit', saveLead);

(async () => {
  try {
    await refreshAll();
    populateUserSelect();
  } catch (err) {
    showToast(`Failed to load data: ${err.message}`, 'error');
  }
})();
