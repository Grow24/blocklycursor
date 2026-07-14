import * as Blockly from 'blockly';
import { initWorkspace } from './workspace/init-workspace.js';
import {
  downloadJson,
  exportRequirementJson,
  toCursorImplementationPayload,
} from './export/requirement-exporter.js';
import { BLOCK_JSON_MAPPING, MANUAL_ENTRY_STEPS } from './guide/mapping-guide.js';

const workspace = initWorkspace('blocklyDiv');
const statusEl = document.getElementById('status');
const guidePanel = document.getElementById('guide-panel');
const guideStepsEl = document.getElementById('guide-steps');
const guideMappingRowsEl = document.getElementById('guide-mapping-rows');
const previewRequirementEl = document.getElementById('preview-requirement');
const previewCursorEl = document.getElementById('preview-cursor');
const previewErrorEl = document.getElementById('preview-error');
const mainEl = document.querySelector('main');
const dispatchPanel = document.getElementById('cursor-dispatch-panel');
const dispatchMessageEl = document.getElementById('dispatch-message');
const dispatchPromptEl = document.getElementById('dispatch-prompt');
const openCursorBtn = document.getElementById('btn-open-cursor');
const openCursorWebBtn = document.getElementById('btn-open-cursor-web');
const copyPromptBtn = document.getElementById('btn-copy-prompt');
const callApiBtn = document.getElementById('btn-call-api');
const closeDispatchBtn = document.getElementById('btn-close-dispatch');
const cursorApiResultEl = document.getElementById('cursor-api-result');
const cursorApiResponseEl = document.getElementById('cursor-api-response');
let lastDispatchDeepLink = '';
let lastDispatchWebUrl = '';
let lastDispatchPrompt = '';
let lastDispatchRequirementId = '';
let lastDispatchPayloadFile = '';
let callApiInFlight = false;
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

function initGuidePanel() {
  guideStepsEl.innerHTML = MANUAL_ENTRY_STEPS.map((step) => `<li>${step}</li>`).join('');
  guideMappingRowsEl.innerHTML = BLOCK_JSON_MAPPING.map(
    (row) =>
      `<tr><td>${row.block}</td><td>${row.fields}</td><td><code>${row.requirement}</code></td><td><code>${row.cursor}</code></td></tr>`,
  ).join('');
}

function refreshJsonPreview() {
  previewErrorEl.classList.add('hidden');
  previewErrorEl.textContent = '';
  try {
    const requirement = exportRequirementJson(workspace);
    const cursorPayload = toCursorImplementationPayload(requirement);
    const requirementPreview = { ...requirement };
    delete requirementPreview.blockly_workspace;
    previewRequirementEl.textContent = JSON.stringify(requirementPreview, null, 2);
    previewCursorEl.textContent = JSON.stringify(cursorPayload, null, 2);
  } catch (err) {
    previewRequirementEl.textContent = '—';
    previewCursorEl.textContent = '—';
    previewErrorEl.textContent = err.message;
    previewErrorEl.classList.remove('hidden');
  }
}

function openGuidePanel() {
  guidePanel.classList.remove('hidden');
  mainEl.classList.add('guide-open');
  refreshJsonPreview();
}

function closeGuidePanel() {
  guidePanel.classList.add('hidden');
  mainEl.classList.remove('guide-open');
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
    lastDispatchRequirementId = requirement.requirement_id || '';
    lastDispatchPayloadFile = result.payload_file || '';
    cursorApiResultEl.classList.add('hidden');
    cursorApiResponseEl.textContent = '';
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

async function callCursorApi() {
  if (callApiInFlight) return;
  const prompt = (lastDispatchPrompt || dispatchPromptEl.value || '').trim();
  if (!prompt) {
    setStatus('No dispatch prompt available. Export Cursor Pack first.', 'error');
    return;
  }

  callApiInFlight = true;
  callApiBtn.disabled = true;
  cursorApiResultEl.classList.remove('hidden');
  cursorApiResponseEl.textContent = 'Calling Cursor Cloud Agents API...';
  setStatus('Calling Cursor API...', 'ok');

  try {
    const res = await fetch('/api/cursor/call-api', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_prompt: prompt,
        requirement_id: lastDispatchRequirementId,
        payload_file: lastDispatchPayloadFile,
      }),
    });
    const result = await res.json();
    cursorApiResponseEl.textContent = JSON.stringify(result, null, 2);
    if (!res.ok || !result.ok) {
      setStatus(result.message || 'Cursor API call failed', 'error');
      return;
    }
    setStatus(
      result.agent_url
        ? `Cursor agent launched: ${result.agent_url}`
        : 'Cursor Cloud Agent launched — see API response below',
      'ok',
    );
  } catch (err) {
    cursorApiResponseEl.textContent = JSON.stringify(
      { ok: false, message: err.message },
      null,
      2,
    );
    setStatus(`Cursor API error: ${err.message}`, 'error');
  } finally {
    callApiInFlight = false;
    callApiBtn.disabled = false;
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
document.getElementById('btn-guide').addEventListener('click', openGuidePanel);
document.getElementById('btn-close-guide').addEventListener('click', closeGuidePanel);
document.getElementById('btn-refresh-preview').addEventListener('click', refreshJsonPreview);
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
callApiBtn.addEventListener('click', callCursorApi);
closeDispatchBtn.addEventListener('click', () => {
  dispatchPanel.classList.add('hidden');
});

workspace.addChangeListener((event) => {
  if (!event || event.isUiEvent) return;
  const summary = summarizeWorkspaceEvent(event);
  if (summary) setStatus(summary);
  if (!guidePanel.classList.contains('hidden')) {
    refreshJsonPreview();
  }
});

initGuidePanel();
setStatus('Ready — Ctrl/Cmd+F for workspace search');
