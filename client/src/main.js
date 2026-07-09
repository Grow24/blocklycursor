import * as Blockly from 'blockly';
import { initWorkspace } from './workspace/init-workspace.js';
import {
  downloadJson,
  exportRequirementJson,
  toCursorImplementationPayload,
} from './export/requirement-exporter.js';

const workspace = initWorkspace('blocklyDiv');
const statusEl = document.getElementById('status');
const dispatchPanel = document.getElementById('cursor-dispatch-panel');
const dispatchMessageEl = document.getElementById('dispatch-message');
const dispatchPromptEl = document.getElementById('dispatch-prompt');
const openCursorBtn = document.getElementById('btn-open-cursor');
const openCursorWebBtn = document.getElementById('btn-open-cursor-web');
const copyPromptBtn = document.getElementById('btn-copy-prompt');
const closeDispatchBtn = document.getElementById('btn-close-dispatch');
let lastDispatchDeepLink = '';
let lastDispatchWebUrl = '';
let lastDispatchPrompt = '';
const changeStats = {
  added: 0,
  deleted: 0,
  moved: 0,
  changed: 0,
};

function setStatus(message, type = '') {
  statusEl.textContent = message;
  statusEl.className = `status ${type}`;
}

function summarizeWorkspaceEvent(event) {
  if (!event || !event.type) return '';
  if (event.type === Blockly.Events.BLOCK_CREATE) {
    changeStats.added += event.ids?.length || 1;
    return `Block added (${changeStats.added} total adds)`;
  }
  if (event.type === Blockly.Events.BLOCK_DELETE) {
    changeStats.deleted += event.ids?.length || 1;
    return `Block deleted (${changeStats.deleted} total deletes)`;
  }
  if (event.type === Blockly.Events.BLOCK_MOVE) {
    changeStats.moved += 1;
    return `Block moved (${changeStats.moved} moves)`;
  }
  if (event.type === Blockly.Events.BLOCK_CHANGE) {
    changeStats.changed += 1;
    const field = event.name ? ` field "${event.name}"` : '';
    return `Value changed${field} (${changeStats.changed} edits)`;
  }
  return '';
}

async function saveAndValidate() {
  try {
    const requirement = exportRequirementJson(workspace);
    const res = await fetch('/api/requirements/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requirement),
    });
    const result = await res.json();
    if (!res.ok) {
      const details = Array.isArray(result.errors) ? result.errors.join(' | ') : '';
      setStatus(details || result.message || 'Validation failed', 'error');
      return;
    }
    const saveRes = await fetch('/api/requirements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requirement),
    });
    const saved = await saveRes.json();
    if (!saveRes.ok) {
      const details = Array.isArray(saved.errors) ? saved.errors.join(' | ') : '';
      setStatus(details || saved.message || 'Save failed', 'error');
      return;
    }
    setStatus(`Saved ${saved.requirement_id} — validation passed`, 'ok');
  } catch (err) {
    setStatus(err.message, 'error');
  }
}

function exportJson() {
  try {
    const requirement = exportRequirementJson(workspace);
    downloadJson(`${requirement.requirement_id || 'requirement'}.json`, requirement);
    setStatus('Exported JSON downloaded', 'ok');
  } catch (err) {
    setStatus(err.message, 'error');
  }
}

function exportCursorPack() {
  try {
    const requirement = exportRequirementJson(workspace);
    const payload = toCursorImplementationPayload(requirement);
    downloadJson(`cursor-payload-${requirement.requirement_id || 'requirement'}.json`, payload);
    setStatus('Cursor Pack downloaded. Dispatching to Cursor...', 'ok');
    dispatchToCursor(requirement);
  } catch (err) {
    setStatus(err.message, 'error');
  }
}

async function dispatchToCursor(requirement) {
  try {
    const res = await fetch('/api/cursor/dispatch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requirement),
    });
    const result = await res.json();
    if (!res.ok || !result.ok) {
      const details = Array.isArray(result.errors) ? result.errors.join(' | ') : '';
      setStatus(details || result.message || 'Cursor dispatch failed', 'error');
      return;
    }

    lastDispatchDeepLink = result.cursor_deeplink || '';
    lastDispatchWebUrl = result.cursor_web_url || '';
    lastDispatchPrompt = result.chat_prompt || '';
    dispatchMessageEl.textContent = `Payload ready at ${result.payload_file}. If chat does not open automatically, copy prompt and paste into Cursor chat.`;
    dispatchPromptEl.value = lastDispatchPrompt;
    dispatchPanel.classList.remove('hidden');

    if (lastDispatchDeepLink) {
      // location.href works more reliably than popup in many browsers.
      window.location.href = lastDispatchDeepLink;
      setStatus('Cursor dispatch prepared. Opening chat deep-link...', 'ok');
      return;
    }
    setStatus('Cursor dispatch prepared. Copy prompt and open chat manually.', 'ok');
  } catch (err) {
    setStatus(`Cursor dispatch error: ${err.message}`, 'error');
  }
}

async function loadSample() {
  try {
    const res = await fetch('/api/requirements/sample');
    const sample = await res.json();
    if (sample.blockly_workspace) {
      Blockly.serialization.workspaces.load(sample.blockly_workspace, workspace, undefined);
    }
    setStatus('Sample requirement loaded', 'ok');
  } catch (err) {
    setStatus(err.message, 'error');
  }
}

document.getElementById('btn-save').addEventListener('click', saveAndValidate);
document.getElementById('btn-export').addEventListener('click', exportJson);
document.getElementById('btn-cursor').addEventListener('click', exportCursorPack);
document.getElementById('btn-load').addEventListener('click', loadSample);
openCursorBtn.addEventListener('click', () => {
  if (lastDispatchDeepLink) {
    window.location.href = lastDispatchDeepLink;
    setStatus('Opening Cursor chat deep-link...', 'ok');
    return;
  }
  setStatus('Deep-link unavailable. Paste prompt manually.', 'error');
});
openCursorWebBtn.addEventListener('click', () => {
  if (lastDispatchWebUrl) {
    window.open(lastDispatchWebUrl, '_blank', 'noopener,noreferrer');
    setStatus('Opened Cursor web chat fallback.', 'ok');
    return;
  }
  setStatus('Web chat fallback URL unavailable.', 'error');
});
copyPromptBtn.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(lastDispatchPrompt || dispatchPromptEl.value);
    setStatus('Prompt copied. Paste it in Cursor chat.', 'ok');
  } catch {
    dispatchPromptEl.select();
    document.execCommand('copy');
    setStatus('Prompt copied using fallback.', 'ok');
  }
});
closeDispatchBtn.addEventListener('click', () => {
  dispatchPanel.classList.add('hidden');
});

workspace.addChangeListener((event) => {
  if (!event || event.isUiEvent) return;
  const summary = summarizeWorkspaceEvent(event);
  if (summary) setStatus(summary);
});

setStatus('Ready — Ctrl/Cmd+F for workspace search');
