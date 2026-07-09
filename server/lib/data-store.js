/**
 * PBMP Traceability
 * Requirement: REQ-SALES-001
 * Data entities: Lead, Task, User, AuditLog
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync, renameSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';

const DATA_DIR = process.env.PBMP_LMS_DATA_DIR || join(process.cwd(), 'data', 'lms');
const STORE_FILE = join(DATA_DIR, 'store.json');

const EMPTY_STORE = {
  users: [],
  leads: [],
  tasks: [],
  notifications: [],
  audit_log: [],
};

function ensureDataDir() {
  mkdirSync(DATA_DIR, { recursive: true });
}

function readStore() {
  ensureDataDir();
  if (!existsSync(STORE_FILE)) {
    return structuredClone(EMPTY_STORE);
  }
  try {
    return JSON.parse(readFileSync(STORE_FILE, 'utf8'));
  } catch {
    return structuredClone(EMPTY_STORE);
  }
}

function writeStore(store) {
  ensureDataDir();
  const tmp = `${STORE_FILE}.${randomUUID()}.tmp`;
  writeFileSync(tmp, JSON.stringify(store, null, 2));
  renameSync(tmp, STORE_FILE);
}

function mutate(fn) {
  const store = readStore();
  const result = fn(store);
  writeStore(store);
  return result;
}

export function seedDefaults() {
  const store = readStore();
  if (store.users.length > 0) return store;

  const salesManager = {
    id: randomUUID(),
    name: 'Alex Morgan',
    email: 'alex.morgan@example.com',
    role: 'Sales Manager',
    created_at: new Date().toISOString(),
  };
  const businessOwner = {
    id: randomUUID(),
    name: 'Jordan Lee',
    email: 'jordan.lee@example.com',
    role: 'Business Owner',
    created_at: new Date().toISOString(),
  };

  store.users.push(salesManager, businessOwner);
  writeStore(store);
  return store;
}

export function listUsers({ role } = {}) {
  const store = readStore();
  if (role) return store.users.filter((u) => u.role === role);
  return store.users;
}

export function getUserById(id) {
  return readStore().users.find((u) => u.id === id) || null;
}

export function listLeads() {
  return readStore().leads.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
}

export function getLeadById(id) {
  return readStore().leads.find((l) => l.id === id) || null;
}

export function createLead({ name, email, company, lead_score = 0, assigned_to = null, status = 'new' }) {
  return mutate((store) => {
    const now = new Date().toISOString();
    const lead = {
      id: randomUUID(),
      name,
      email,
      company: company || '',
      lead_score: Number(lead_score),
      assigned_to,
      status,
      created_at: now,
      updated_at: now,
    };
    store.leads.push(lead);
    appendAudit(store, {
      action: 'lead_created',
      entity_type: 'lead',
      entity_id: lead.id,
      requirement_id: 'REQ-SALES-001',
      details: { name: lead.name, lead_score: lead.lead_score },
    });
    return lead;
  });
}

export function updateLead(id, patch) {
  return mutate((store) => {
    const index = store.leads.findIndex((l) => l.id === id);
    if (index === -1) return null;

    const existing = store.leads[index];
    const updated = {
      ...existing,
      ...patch,
      id: existing.id,
      created_at: existing.created_at,
      updated_at: new Date().toISOString(),
    };
    if (patch.lead_score !== undefined) {
      updated.lead_score = Number(patch.lead_score);
    }
    store.leads[index] = updated;
    return updated;
  });
}

export function deleteLead(id) {
  return mutate((store) => {
    const index = store.leads.findIndex((l) => l.id === id);
    if (index === -1) return false;
    store.leads.splice(index, 1);
    return true;
  });
}

export function createTask({ title, assigned_role, assigned_to, lead_id, requirement_id = 'REQ-SALES-001' }) {
  return mutate((store) => {
    const task = {
      id: randomUUID(),
      title,
      assigned_role,
      assigned_to,
      lead_id,
      requirement_id,
      status: 'open',
      created_at: new Date().toISOString(),
    };
    store.tasks.push(task);
    appendAudit(store, {
      action: 'task_created',
      entity_type: 'task',
      entity_id: task.id,
      requirement_id,
      details: { title, assigned_role, lead_id },
    });
    return task;
  });
}

export function listTasks({ lead_id, assigned_role, status } = {}) {
  let tasks = readStore().tasks;
  if (lead_id) tasks = tasks.filter((t) => t.lead_id === lead_id);
  if (assigned_role) tasks = tasks.filter((t) => t.assigned_role === assigned_role);
  if (status) tasks = tasks.filter((t) => t.status === status);
  return tasks.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

export function createNotification({ role, recipient_id, message, lead_id, requirement_id = 'REQ-SALES-001' }) {
  return mutate((store) => {
    const notification = {
      id: randomUUID(),
      role,
      recipient_id,
      message,
      lead_id,
      requirement_id,
      read: false,
      created_at: new Date().toISOString(),
    };
    store.notifications.push(notification);
    appendAudit(store, {
      action: 'notification_sent',
      entity_type: 'notification',
      entity_id: notification.id,
      requirement_id,
      details: { role, recipient_id, message, lead_id },
    });
    return notification;
  });
}

export function listNotifications({ role, recipient_id, unread_only } = {}) {
  let notifications = readStore().notifications;
  if (role) notifications = notifications.filter((n) => n.role === role);
  if (recipient_id) notifications = notifications.filter((n) => n.recipient_id === recipient_id);
  if (unread_only) notifications = notifications.filter((n) => !n.read);
  return notifications.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

export function markNotificationRead(id) {
  return mutate((store) => {
    const notification = store.notifications.find((n) => n.id === id);
    if (!notification) return null;
    notification.read = true;
    return notification;
  });
}

export function listAuditLog({ entity_type, requirement_id } = {}) {
  let entries = readStore().audit_log;
  if (entity_type) entries = entries.filter((e) => e.entity_type === entity_type);
  if (requirement_id) entries = entries.filter((e) => e.requirement_id === requirement_id);
  return entries.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

export function appendAudit(store, { action, entity_type, entity_id, requirement_id, details = {} }) {
  const entry = {
    id: randomUUID(),
    action,
    entity_type,
    entity_id,
    requirement_id,
    details,
    created_at: new Date().toISOString(),
  };
  store.audit_log.push(entry);
  return entry;
}

export function appendAuditEntry(payload) {
  return mutate((store) => appendAudit(store, payload));
}

export function resetStoreForTests() {
  writeStore(structuredClone(EMPTY_STORE));
}

export function getStorePath() {
  return STORE_FILE;
}
