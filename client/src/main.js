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
const estimateCostBtn = document.getElementById('btn-estimate-cost');
const closeDispatchBtn = document.getElementById('btn-close-dispatch');
const cursorApiResultEl = document.getElementById('cursor-api-result');
const cursorApiResponseEl = document.getElementById('cursor-api-response');
const cursorAgentOutputEl = document.getElementById('cursor-agent-output');
const cursorOutputStatusEl = document.getElementById('cursor-output-status');
const tokenEstimateBannerEl = document.getElementById('token-estimate-banner');
const tokenEstimateSummaryEl = document.getElementById('token-estimate-summary');
const tokenEstimateDetailsEl = document.getElementById('token-estimate-details');
const governanceWarningsEl = document.getElementById('governance-warnings');
let lastDispatchDeepLink = '';
let lastDispatchWebUrl = '';
let lastDispatchPrompt = '';
let lastDispatchRequirementId = '';
let lastDispatchPayloadFile = '';
let lastTokenEstimate = null;
let lastGovernancePreview = null;
let callApiInFlight = false;
let agentPollTimer = null;
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
    lastTokenEstimate = result.token_estimate || null;
    lastGovernancePreview = result.governance_preview || null;
    cursorApiResultEl.classList.add('hidden');
    cursorApiResponseEl.textContent = '';
    if (cursorAgentOutputEl) cursorAgentOutputEl.textContent = 'Waiting for Call API…';
    if (cursorOutputStatusEl) cursorOutputStatusEl.textContent = '';
    stopAgentPolling();
    dispatchMessageEl.textContent = `Payload ready at ${result.payload_file}. Review estimated cost range below before Call API.`;
    dispatchPromptEl.value = lastDispatchPrompt;
    renderTokenEstimate(lastTokenEstimate, lastGovernancePreview);
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

function formatTokenCount(n) {
  return Number(n || 0).toLocaleString();
}

function formatUsd(n) {
  return `$${(Number(n) || 0).toFixed(2)}`;
}

function renderTokenEstimate(estimate, governance = null) {
  if (!tokenEstimateSummaryEl || !tokenEstimateDetailsEl) return;
  if (tokenEstimateBannerEl) tokenEstimateBannerEl.classList.remove('is-blocked');
  if (governanceWarningsEl) governanceWarningsEl.textContent = '';

  if (!estimate) {
    tokenEstimateSummaryEl.textContent = 'Token/cost estimate unavailable for this payload.';
    tokenEstimateDetailsEl.innerHTML = '';
    return;
  }

  const costLow = estimate.estimated_cost_usd_low;
  const costHigh = estimate.estimated_cost_usd_high;
  const rangeLabel =
    estimate.estimated_cost_range_label
    || `${formatUsd(costLow)}–${formatUsd(costHigh)}`;

  tokenEstimateSummaryEl.textContent = `Approximate cost: ${rangeLabel} · Model: ${
    estimate.model || 'auto'
  } · Input tokens ~${formatTokenCount(
    estimate.estimated_input_tokens_low || estimate.estimated_input_tokens,
  )}–${formatTokenCount(
    estimate.estimated_input_tokens_high || estimate.estimated_total_tokens_high,
  )}`;

  tokenEstimateDetailsEl.innerHTML = [
    `<li>Prompt size: ${formatTokenCount(estimate.characters)} characters / ${formatTokenCount(estimate.words)} words</li>`,
    `<li>Estimated input tokens: <strong>${formatTokenCount(estimate.estimated_input_tokens_low || estimate.estimated_input_tokens)} – ${formatTokenCount(estimate.estimated_input_tokens_high || estimate.estimated_input_tokens)}</strong></li>`,
    `<li>Estimated output tokens: ~${formatTokenCount(estimate.estimated_output_tokens_low || estimate.estimated_output_tokens)} – ${formatTokenCount(estimate.estimated_output_tokens_high || estimate.estimated_output_tokens)}</li>`,
    `<li>Approximate cost: <strong>${rangeLabel}</strong></li>`,
    `<li>Method: ${estimate.method || 'approximate'} (not exact Cursor billing)</li>`,
  ].join('');

  const warnings = governance?.warnings || [];
  const errors = governance?.errors || [];
  if (governanceWarningsEl && (warnings.length || errors.length)) {
    const lines = [
      ...errors.map((e) => `Blocked: ${e.message || e.code}`),
      ...warnings.map((w) => `Warning: ${w.message || w.code}`),
    ];
    governanceWarningsEl.textContent = lines.join('\n');
  }
  if (tokenEstimateBannerEl && errors.length) {
    tokenEstimateBannerEl.classList.add('is-blocked');
  }

  if (callApiBtn) {
    callApiBtn.textContent = `Call API (${rangeLabel})`;
    callApiBtn.title = `Approximate cost ${rangeLabel}; input ~${formatTokenCount(estimate.estimated_input_tokens)} tokens`;
  }
}

function confirmTokenUsageBeforeCall(estimate, governance = null) {
  const range =
    estimate?.estimated_cost_range_label
    || `${formatUsd(estimate?.estimated_cost_usd_low)}–${formatUsd(estimate?.estimated_cost_usd_high)}`;
  const inputLow = formatTokenCount(
    estimate?.estimated_input_tokens_low || estimate?.estimated_input_tokens || 0,
  );
  const inputHigh = formatTokenCount(
    estimate?.estimated_input_tokens_high || estimate?.estimated_total_tokens_high || 0,
  );
  const warningLines = (governance?.warnings || []).map((w) => `• ${w.message || w.code}`);
  return window.confirm(
    [
      'Cursor Cost Preview',
      '',
      `• Approximate cost: ${range}`,
      `• Estimated input tokens: ${inputLow} – ${inputHigh}`,
      `• Model: ${estimate?.model || 'auto'}`,
      '',
      ...(warningLines.length ? ['Warnings:', ...warningLines, ''] : []),
      'This is an approximate range. Cloud Agents may use more for repository context.',
      '',
      'Submit to Cursor now?',
    ].join('\n'),
  );
}

async function refreshCostEstimate() {
  const prompt = (lastDispatchPrompt || dispatchPromptEl.value || '').trim();
  if (!prompt) {
    setStatus('No dispatch prompt available. Export Cursor Pack first.', 'error');
    return;
  }
  try {
    const res = await fetch('/api/cursor/estimate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_prompt: prompt,
        requirement_id: lastDispatchRequirementId,
      }),
    });
    const result = await res.json();
    if (!res.ok || !result.ok) {
      setStatus(result.message || 'Cost estimate failed', 'error');
      return;
    }
    lastTokenEstimate = result.token_estimate || null;
    lastGovernancePreview = result.governance_preview || null;
    renderTokenEstimate(lastTokenEstimate, lastGovernancePreview);
    setStatus(`Estimated cost ${lastTokenEstimate?.estimated_cost_range_label || ''}`, 'ok');
  } catch (err) {
    setStatus(`Estimate error: ${err.message}`, 'error');
  }
}

async function callCursorApi() {
  if (callApiInFlight) return;
  const prompt = (lastDispatchPrompt || dispatchPromptEl.value || '').trim();
  if (!prompt) {
    setStatus('No dispatch prompt available. Export Cursor Pack first.', 'error');
    return;
  }

  if (!lastTokenEstimate) {
    await refreshCostEstimate();
  }
  if (!lastTokenEstimate) {
    setStatus('Could not estimate cost. Try Estimate Cost first.', 'error');
    return;
  }

  if (lastGovernancePreview && lastGovernancePreview.allowed === false) {
    renderTokenEstimate(lastTokenEstimate, lastGovernancePreview);
    setStatus('Cursor call blocked by PBMP budget/token limits. See warnings above.', 'error');
    return;
  }

  if (!confirmTokenUsageBeforeCall(lastTokenEstimate, lastGovernancePreview)) {
    setStatus('Call API cancelled — review cost estimate when ready.', 'ok');
    return;
  }

  stopAgentPolling();
  callApiInFlight = true;
  callApiBtn.disabled = true;
  cursorApiResultEl.classList.remove('hidden');
  cursorApiResponseEl.textContent = 'Calling Cursor Cloud Agents API...';
  cursorOutputStatusEl.textContent = 'Launching agent…';
  cursorAgentOutputEl.textContent = 'Waiting for Cursor final output…';
  setStatus('Calling Cursor API...', 'ok');

  try {
    const res = await fetch('/api/cursor/call-api', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_prompt: prompt,
        requirement_id: lastDispatchRequirementId,
        payload_file: lastDispatchPayloadFile,
        cost_confirmed: true,
      }),
    });
    const result = await res.json();
    cursorApiResponseEl.textContent = JSON.stringify(result, null, 2);
    if (result.token_estimate) {
      lastTokenEstimate = result.token_estimate;
      lastGovernancePreview = result.governance || lastGovernancePreview;
      renderTokenEstimate(lastTokenEstimate, lastGovernancePreview);
    }
    if (!res.ok || !result.ok) {
      cursorOutputStatusEl.textContent = 'Launch failed';
      cursorAgentOutputEl.textContent = result.message || 'Cursor API call failed';
      setStatus(result.message || 'Cursor API call failed', 'error');
      return;
    }

    setStatus(
      result.agent_url
        ? `Cursor agent launched: ${result.agent_url}`
        : 'Cursor Cloud Agent launched — waiting for final output…',
      'ok',
    );
    cursorOutputStatusEl.textContent = `Agent launched. Polling for final output… (${result.agent_id || ''})`;
    await pollAgentOutput(result.agent_id, result.run_id);
  } catch (err) {
    cursorApiResponseEl.textContent = JSON.stringify(
      { ok: false, message: err.message },
      null,
      2,
    );
    cursorOutputStatusEl.textContent = 'Error';
    cursorAgentOutputEl.textContent = err.message;
    setStatus(`Cursor API error: ${err.message}`, 'error');
  } finally {
    callApiInFlight = false;
    callApiBtn.disabled = false;
  }
}

function stopAgentPolling() {
  if (agentPollTimer) {
    clearTimeout(agentPollTimer);
    agentPollTimer = null;
  }
}

async function pollAgentOutput(agentId, runId) {
  if (!agentId) {
    cursorOutputStatusEl.textContent = 'No agent_id returned — cannot poll output';
    cursorAgentOutputEl.textContent =
      'Open the agent URL from the launch response, or retry Call API.';
    return;
  }

  const startedAt = Date.now();
  const maxMs = 12 * 60 * 1000; // 12 minutes
  const intervalMs = 5000;
  let attempt = 0;

  const tick = async () => {
    attempt += 1;
    try {
      const qs = new URLSearchParams({ agent_id: agentId });
      if (runId) qs.set('run_id', runId);
      const res = await fetch(`/api/cursor/agent-run?${qs.toString()}`);
      const data = await res.json();

      if (!res.ok || !data.ok) {
        cursorOutputStatusEl.textContent = data.message || 'Poll failed';
        cursorAgentOutputEl.textContent = JSON.stringify(data, null, 2);
        if (Date.now() - startedAt < maxMs) {
          agentPollTimer = setTimeout(tick, intervalMs);
        }
        return;
      }

      // Keep run_id if API resolved it late
      if (data.run_id) runId = data.run_id;

      cursorOutputStatusEl.textContent = `Status: ${data.status} · poll #${attempt}${
        data.agent_url ? ` · ${data.agent_url}` : ''
      }`;

      if (data.done) {
        const text =
          data.output ||
          '(No final text returned by Cursor yet. Open agent URL for full conversation / PR.)';
        cursorAgentOutputEl.textContent = text;
        setStatus(
          data.status === 'FINISHED'
            ? 'Cursor agent finished — final output shown in modal'
            : `Cursor run ended: ${data.status}`,
          data.status === 'FINISHED' ? 'ok' : 'error',
        );
        return;
      }

      cursorAgentOutputEl.textContent = [
        'Cursor is still working on your prompt…',
        `Status: ${data.status}`,
        data.agent_url ? `Agent: ${data.agent_url}` : '',
        'Final reply will appear here when the run finishes.',
      ]
        .filter(Boolean)
        .join('\n');

      if (Date.now() - startedAt >= maxMs) {
        cursorOutputStatusEl.textContent = 'Polling timeout — open agent URL for live progress';
        cursorAgentOutputEl.textContent = [
          'Timed out waiting for final output in this modal.',
          data.agent_url || `https://cursor.com/agents/${agentId}`,
          'You can reopen Export Cursor Pack → Call API later, or open the agent URL above.',
        ].join('\n');
        setStatus('Cursor poll timeout — check agent URL', 'error');
        return;
      }

      agentPollTimer = setTimeout(tick, intervalMs);
    } catch (err) {
      cursorOutputStatusEl.textContent = `Poll error: ${err.message}`;
      if (Date.now() - startedAt < maxMs) {
        agentPollTimer = setTimeout(tick, intervalMs);
      }
    }
  };

  await tick();
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
if (estimateCostBtn) estimateCostBtn.addEventListener('click', refreshCostEstimate);
callApiBtn.addEventListener('click', callCursorApi);
closeDispatchBtn.addEventListener('click', () => {
  stopAgentPolling();
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
