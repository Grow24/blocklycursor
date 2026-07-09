/**
 * PBMP Traceability
 * Requirement: REQ-SALES-001
 */

const API_BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

export const api = {
  getLeads: () => request('/leads'),
  getLead: (id) => request(`/leads/${id}`),
  createLead: (body) => request('/leads', { method: 'POST', body: JSON.stringify(body) }),
  updateLead: (id, body) => request(`/leads/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  updateScore: (id, lead_score) =>
    request(`/leads/${id}/score`, { method: 'PATCH', body: JSON.stringify({ lead_score }) }),
  deleteLead: async (id) => {
    const res = await fetch(`${API_BASE}/leads/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `Request failed (${res.status})`);
    }
  },
  getTasks: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/tasks${qs ? `?${qs}` : ''}`);
  },
  getNotifications: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/notifications${qs ? `?${qs}` : ''}`);
  },
  getAudit: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/audit${qs ? `?${qs}` : ''}`);
  },
  getUsers: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/users${qs ? `?${qs}` : ''}`);
  },
};
