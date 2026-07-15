/**
 * PBMP Cursor Token Governance (Ops)
 * Source: Cursor Integration / GAP-CURSOR-TOKEN-001
 *
 * Local ledger for Cursor runs + per-user / project / global usage tracking.
 * Cursor Pro is one shared account — PBMP owns per-user chargeback data.
 */

import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));

function dataFilePath() {
  const base = process.env.PBMP_CURSOR_DATA_DIR
    || process.env.PBMP_DATA_DIR
    || join(__dirname, '..', 'data', 'cursor');
  mkdirSync(base, { recursive: true });
  return join(base, 'cursor-runs.json');
}

function emptyStore() {
  return { runs: [], updated_at: new Date().toISOString() };
}

export function readCursorRunsStore() {
  const path = dataFilePath();
  if (!existsSync(path)) return emptyStore();
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf8'));
    if (!parsed || !Array.isArray(parsed.runs)) return emptyStore();
    return parsed;
  } catch {
    return emptyStore();
  }
}

function writeCursorRunsStore(store) {
  const path = dataFilePath();
  store.updated_at = new Date().toISOString();
  writeFileSync(path, JSON.stringify(store, null, 2));
  return store;
}

export function resetCursorRunsStoreForTests() {
  writeCursorRunsStore(emptyStore());
}

function monthKey(d = new Date()) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function dayKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

export function createCursorRun(record) {
  const store = readCursorRunsStore();
  const now = new Date().toISOString();
  const run = {
    id: record.id || `crun_${randomUUID()}`,
    pbmp_user_id: record.pbmp_user_id,
    pbmp_user_tier: record.pbmp_user_tier || 'trial',
    pbmp_project_id: record.pbmp_project_id || null,
    pbmp_task_id: record.pbmp_task_id || null,
    cursor_agent_id: record.cursor_agent_id || null,
    cursor_run_id: record.cursor_run_id || null,
    repo_url: record.repo_url || null,
    source_ref: record.source_ref || null,
    target_branch: record.target_branch || null,
    model_requested: record.model_requested || 'auto',
    prompt_hash: record.prompt_hash || null,
    estimated_input_tokens: record.estimated_input_tokens ?? null,
    estimated_output_tokens: record.estimated_output_tokens ?? null,
    estimated_cost_low: record.estimated_cost_low ?? null,
    estimated_cost_high: record.estimated_cost_high ?? null,
    estimated_cost_for_budget: record.estimated_cost_for_budget ?? record.estimated_cost_high ?? null,
    status: record.status || 'CREATED',
    cursor_web_url: record.cursor_web_url || null,
    pr_url: record.pr_url || null,
    error_message: record.error_message || null,
    final_reconciled_cost: record.final_reconciled_cost ?? null,
    created_at: now,
    completed_at: null,
    month_key: monthKey(),
    day_key: dayKey(),
  };
  store.runs.unshift(run);
  writeCursorRunsStore(store);
  return run;
}

export function updateCursorRun(idOrAgentOrRun, patch) {
  const store = readCursorRunsStore();
  const idx = store.runs.findIndex(
    (r) =>
      r.id === idOrAgentOrRun
      || r.cursor_agent_id === idOrAgentOrRun
      || r.cursor_run_id === idOrAgentOrRun,
  );
  if (idx < 0) return null;
  store.runs[idx] = {
    ...store.runs[idx],
    ...patch,
  };
  if (patch.status && ['FINISHED', 'ERROR', 'CANCELLED', 'EXPIRED', 'FAILED'].includes(patch.status)) {
    store.runs[idx].completed_at = patch.completed_at || new Date().toISOString();
  }
  writeCursorRunsStore(store);
  return store.runs[idx];
}

export function listCursorRuns({ userId, projectId, limit = 50 } = {}) {
  const store = readCursorRunsStore();
  let runs = store.runs;
  if (userId) runs = runs.filter((r) => r.pbmp_user_id === userId);
  if (projectId) runs = runs.filter((r) => r.pbmp_project_id === projectId);
  return runs.slice(0, limit);
}

export function getCursorRunByAgent(agentId) {
  return readCursorRunsStore().runs.find((r) => r.cursor_agent_id === agentId) || null;
}

const ACTIVE_STATUSES = new Set(['CREATED', 'QUEUED', 'RUNNING', 'WAITING', 'LAUNCHED', 'LAUNCHING']);

/**
 * Budget/usage snapshot used by governance gates.
 */
export function getUsageSnapshot({ userId, projectId, now = new Date() } = {}) {
  const store = readCursorRunsStore();
  const mk = monthKey(now);
  const dk = dayKey(now);
  const monthRuns = store.runs.filter((r) => r.month_key === mk);
  const dayRuns = store.runs.filter((r) => r.day_key === dk);

  const costOf = (r) =>
    Number(r.final_reconciled_cost ?? r.estimated_cost_for_budget ?? r.estimated_cost_high ?? 0) || 0;

  const userMonth = monthRuns.filter((r) => r.pbmp_user_id === userId);
  const userDay = dayRuns.filter((r) => r.pbmp_user_id === userId);
  const projectMonth = projectId
    ? monthRuns.filter((r) => r.pbmp_project_id === projectId)
    : [];
  const projectDay = projectId
    ? dayRuns.filter((r) => r.pbmp_project_id === projectId)
    : [];

  return {
    month_key: mk,
    day_key: dk,
    user_runs_today: userDay.length,
    user_runs_month: userMonth.length,
    user_cost_month: sum(userMonth.map(costOf)),
    project_runs_today: projectDay.length,
    project_cost_month: sum(projectMonth.map(costOf)),
    global_runs_month: monthRuns.length,
    global_cost_month: sum(monthRuns.map(costOf)),
    concurrent_active: store.runs.filter((r) => ACTIVE_STATUSES.has(String(r.status || '').toUpperCase())).length,
  };
}

function sum(arr) {
  return arr.reduce((a, b) => a + (Number(b) || 0), 0);
}
