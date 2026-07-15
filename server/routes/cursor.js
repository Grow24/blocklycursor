/**
 * PBMP Cursor Integration + Token Governance (Ops)
 * Source: Cursor Integration / GAP-CURSOR-TOKEN-001 / GAP-CURSOR-API-001
 */
import { Router } from 'express';
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { validateRequirement, requirementToExpectedOutputContract } from '../lib/validator.js';
import { getCursorGovernanceConfig } from '../lib/cursor-config.js';
import { estimateCursorCost } from '../lib/cursor-cost-estimator.js';
import { evaluateCursorGovernance } from '../lib/cursor-governance.js';
import {
  createCursorRun,
  updateCursorRun,
  listCursorRuns,
  getUsageSnapshot,
} from '../lib/cursor-runs-store.js';
import { normalizeModelId } from '../lib/cursor-model-rates.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PACK_DIR = join(__dirname, '..', '..', 'pbmp-implementation-pack');
const CURSOR_DIR = join(PACK_DIR, 'cursor');

const TERMINAL_RUN_STATUSES = new Set(['FINISHED', 'ERROR', 'CANCELLED', 'EXPIRED']);

const router = Router();

function cfg() {
  return getCursorGovernanceConfig();
}

function cursorAuthHeader(apiKey) {
  return `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}`;
}

async function cursorFetch(url, options = {}) {
  const apiKey = cfg().apiKey;
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: cursorAuthHeader(apiKey),
      Accept: 'application/json',
      ...(options.headers || {}),
    },
  });
  const rawText = await res.text();
  let json = null;
  try {
    json = JSON.parse(rawText);
  } catch {
    json = { raw: rawText };
  }
  return { res, json };
}

function buildCursorPayload(requirement, eoc) {
  return {
    source: 'PBMP_Product_Discovery',
    instruction:
      'Implement only the approved PBMP contract. Do not invent requirements, fields, APIs, roles, screens, workflows, or business rules. If something is missing, create a Gap Log entry instead of guessing.',
    requirement_id: requirement.requirement_id,
    goal: requirement.goal,
    trigger: requirement.trigger,
    condition: requirement.condition,
    conditions: requirement.conditions || [],
    actions: requirement.actions || [],
    structured_actions: requirement.structured_actions || [],
    acceptance_criteria: requirement.acceptance_criteria || [],
    nfrs: requirement.nfrs || {},
    out_of_scope: requirement.out_of_scope || [],
    procedures: requirement.procedures || [],
    functions: requirement.functions || [],
    expected_output_contract: eoc,
    pipeline: [
      'Blockly Requirement Blocks',
      'PBMP Requirement JSON',
      'PBMP validation and approval',
      'Expected Output Contract',
      'Cursor Implementation Pack',
      'Cursor Cloud Agent API / Headless CLI / MCP',
      'Code branch / PR',
      'Tests + review + deployment gates',
    ],
  };
}

function buildChatPrompt(payload) {
  return [
    'You are working inside PBMP.',
    '',
    'SOURCE OF TRUTH:',
    `- pbmp-implementation-pack/cursor/cursor-payload-${payload.requirement_id}.json`,
    '- pbmp-implementation-pack/tests/acceptance-criteria.feature',
    '- pbmp-implementation-pack/design/approved-design.md',
    '- .cursor/rules/*.mdc',
    '',
    'TASK:',
    `Implement ${payload.requirement_id} exactly as specified.`,
    '',
    'STRICT RULES:',
    '1. Do not invent requirements, fields, APIs, screens, roles, workflows, or business rules.',
    '2. Prefer structured_actions for machine-accurate action semantics.',
    '3. If information is missing, update pbmp-implementation-pack/gaps/gap-log.md.',
    '4. First provide an implementation plan before code.',
    '5. At the end of your work, write a clear final reply summarizing: plan, files changed, tests, and any gaps.',
  ].join('\n');
}

function buildFullPromptText(chatPrompt, payloadJson) {
  return [
    chatPrompt,
    '',
    'APPROVED CURSOR PAYLOAD (source of truth — do not invent beyond this):',
    payloadJson ? JSON.stringify(payloadJson, null, 2) : '(payload file not found on server — use chat_prompt only)',
  ].join('\n');
}

function resolveActor(req) {
  const c = cfg();
  return {
    userId:
      req.body?.pbmp_user_id
      || req.headers['x-pbmp-user-id']
      || c.defaultUserId,
    userTier:
      req.body?.pbmp_user_tier
      || req.headers['x-pbmp-user-tier']
      || c.defaultUserTier,
    projectId:
      req.body?.pbmp_project_id
      || req.headers['x-pbmp-project-id']
      || c.defaultProjectId,
  };
}

function loadPayloadJson(requirementId) {
  if (!requirementId) return null;
  const payloadPath = join(CURSOR_DIR, `cursor-payload-${requirementId}.json`);
  if (!existsSync(payloadPath)) return null;
  try {
    return JSON.parse(readFileSync(payloadPath, 'utf8'));
  } catch {
    return null;
  }
}

function buildEstimateForRequest({ chatPrompt, requirementId, model, selectedFileTexts }) {
  const payloadJson = loadPayloadJson(requirementId);
  const promptText = buildFullPromptText(chatPrompt, payloadJson);
  return {
    promptText,
    payloadJson,
    estimate: estimateCursorCost({
      promptText,
      model,
      selectedFileTexts,
    }),
  };
}

router.get('/config', (_req, res) => {
  const c = cfg();
  return res.json({
    ok: true,
    requirement_ref: 'GAP-CURSOR-TOKEN-001',
    config: {
      model_default: c.modelDefault,
      allowed_models: c.allowedModels,
      cost_estimate_enabled: c.costEstimateEnabled,
      cost_warning_threshold_usd: c.costWarningThresholdUsd,
      cost_approval_threshold_usd: c.costApprovalThresholdUsd,
      hard_stop_cost_usd: c.hardStopCostUsd,
      require_cost_confirmation: c.requireCostConfirmation,
      trial_daily_run_limit: c.trialDailyRunLimit,
      trial_monthly_budget_usd: c.trialMonthlyBudgetUsd,
      cursor_monthly_budget_usd: c.cursorMonthlyBudgetUsd,
      overage_allowed: c.cursorOverageAllowed,
      allowed_repos: c.allowedRepos,
      repository_configured: Boolean(c.repository),
      api_key_configured: Boolean(c.apiKey),
    },
  });
});

router.get('/usage', (req, res) => {
  const actor = resolveActor(req);
  const usage = getUsageSnapshot({
    userId: actor.userId,
    projectId: actor.projectId,
  });
  const c = cfg();
  return res.json({
    ok: true,
    requirement_ref: 'GAP-CURSOR-TOKEN-001',
    user_id: actor.userId,
    user_tier: actor.userTier,
    project_id: actor.projectId,
    usage,
    budgets: {
      trial_monthly_usd: c.trialMonthlyBudgetUsd,
      paid_monthly_usd: c.paidMonthlyBudgetUsd,
      project_monthly_usd: c.projectMonthlyBudgetUsd,
      global_monthly_usd: c.cursorMonthlyBudgetUsd,
    },
  });
});

router.get('/runs', (req, res) => {
  const actor = resolveActor(req);
  const runs = listCursorRuns({
    userId: typeof req.query.user_id === 'string' ? req.query.user_id : actor.userId,
    projectId: typeof req.query.project_id === 'string' ? req.query.project_id : undefined,
    limit: Number(req.query.limit) || 50,
  });
  return res.json({ ok: true, runs, requirement_ref: 'GAP-CURSOR-TOKEN-001' });
});

/**
 * Backend cost/token estimate before Cursor submit.
 * Frontend must call this — do not trust browser-only pricing math.
 */
router.post('/estimate', (req, res) => {
  const chatPrompt = typeof req.body?.chat_prompt === 'string' ? req.body.chat_prompt.trim() : '';
  const requirementId = typeof req.body?.requirement_id === 'string' ? req.body.requirement_id.trim() : '';
  const model = normalizeModelId(req.body?.model || cfg().modelDefault);
  const selectedFileTexts = Array.isArray(req.body?.selected_file_texts)
    ? req.body.selected_file_texts
    : [];
  const actor = resolveActor(req);

  if (!chatPrompt && !requirementId) {
    return res.status(400).json({
      ok: false,
      message: 'chat_prompt or requirement_id is required',
    });
  }

  const { estimate } = buildEstimateForRequest({
    chatPrompt: chatPrompt || 'Implement approved PBMP requirement.',
    requirementId,
    model,
    selectedFileTexts,
  });

  const gate = evaluateCursorGovernance({
    estimate,
    model,
    userId: actor.userId,
    userTier: actor.userTier,
    projectId: actor.projectId,
    repoUrl: cfg().repository,
    costConfirmed: true, // estimate-only: skip confirmation hard-block
    adminApproved: true,
    selectedFileCount: selectedFileTexts.length,
    selectedFileBytes: estimate.selected_file_bytes,
  });

  // Soft preview: strip confirmation/admin errors that only apply at submit time
  const previewErrors = gate.errors.filter(
    (e) => !['COST_CONFIRMATION_REQUIRED', 'ADMIN_APPROVAL_REQUIRED', 'OVERAGE_ADMIN_REQUIRED'].includes(e.code),
  );

  return res.json({
    ok: true,
    message: 'PBMP token/cost estimate (approximate range)',
    requirement_ref: 'GAP-CURSOR-TOKEN-001',
    model,
    token_estimate: estimate,
    governance_preview: {
      ...gate,
      errors: previewErrors,
      ok: previewErrors.length === 0,
      allowed: previewErrors.length === 0,
    },
  });
});

router.post('/dispatch', (req, res) => {
  const requirement = req.body;
  const result = validateRequirement(requirement);
  if (!result.valid) {
    return res.status(400).json({
      ok: false,
      message: 'Cursor dispatch blocked: requirement validation failed',
      errors: result.errors,
    });
  }

  const eoc = requirementToExpectedOutputContract(requirement);
  const payload = buildCursorPayload(requirement, eoc);

  mkdirSync(CURSOR_DIR, { recursive: true });
  const payloadFile = `cursor-payload-${payload.requirement_id}.json`;
  const payloadPath = join(CURSOR_DIR, payloadFile);
  writeFileSync(payloadPath, JSON.stringify(payload, null, 2));

  const chatPrompt = buildChatPrompt(payload);
  const fullPromptText = buildFullPromptText(chatPrompt, payload);
  const model = normalizeModelId(req.body?.cursor_model || cfg().modelDefault);
  const tokenEstimate = estimateCursorCost({ promptText: fullPromptText, model });
  const actor = resolveActor(req);
  const gate = evaluateCursorGovernance({
    estimate: tokenEstimate,
    model,
    userId: actor.userId,
    userTier: actor.userTier,
    projectId: actor.projectId,
    repoUrl: cfg().repository,
    costConfirmed: true,
    adminApproved: true,
  });
  const previewErrors = gate.errors.filter(
    (e) => !['COST_CONFIRMATION_REQUIRED', 'ADMIN_APPROVAL_REQUIRED', 'OVERAGE_ADMIN_REQUIRED'].includes(e.code),
  );

  const c = cfg();
  const deepLink = `cursor://chat/new?prompt=${encodeURIComponent(chatPrompt)}`;
  const webChatUrl = `${c.webChatUrl}?prompt=${encodeURIComponent(chatPrompt)}`;

  return res.json({
    ok: true,
    message: 'Cursor payload generated and dispatch prepared',
    payload_file: `pbmp-implementation-pack/cursor/${payloadFile}`,
    chat_prompt: chatPrompt,
    cursor_deeplink: deepLink,
    cursor_web_url: webChatUrl,
    model,
    token_estimate: tokenEstimate,
    governance_preview: {
      ...gate,
      errors: previewErrors,
      ok: previewErrors.length === 0,
      allowed: previewErrors.length === 0,
    },
    note: 'Review estimated cost range before Call API. Exact Cursor billing may differ.',
  });
});

/**
 * Calls Cursor Cloud Agents API after PBMP governance checks.
 * Requires CURSOR_API_KEY + allowlisted repository.
 */
router.post('/call-api', async (req, res) => {
  const chatPrompt = typeof req.body?.chat_prompt === 'string' ? req.body.chat_prompt.trim() : '';
  const requirementId = typeof req.body?.requirement_id === 'string' ? req.body.requirement_id.trim() : '';
  const model = normalizeModelId(req.body?.model || cfg().modelDefault);
  const costConfirmed = Boolean(req.body?.cost_confirmed);
  const adminApproved = Boolean(req.body?.admin_approved);
  const selectedFileTexts = Array.isArray(req.body?.selected_file_texts)
    ? req.body.selected_file_texts
    : [];
  const actor = resolveActor(req);
  const c = cfg();

  if (!chatPrompt) {
    return res.status(400).json({
      ok: false,
      message: 'chat_prompt is required (use the Cursor Dispatch Ready prompt text)',
    });
  }

  const { promptText, estimate } = buildEstimateForRequest({
    chatPrompt,
    requirementId,
    model,
    selectedFileTexts,
  });

  const gate = evaluateCursorGovernance({
    estimate,
    model,
    userId: actor.userId,
    userTier: actor.userTier,
    projectId: actor.projectId,
    repoUrl: c.repository,
    costConfirmed,
    adminApproved,
    selectedFileCount: selectedFileTexts.length,
    selectedFileBytes: estimate.selected_file_bytes,
  });

  if (!gate.allowed) {
    const usageLimit = gate.errors.some((e) =>
      ['GLOBAL_CURSOR_BUDGET', 'USER_MONTHLY_BUDGET', 'TRIAL_DAILY_RUN_LIMIT'].includes(e.code),
    );
    return res.status(usageLimit ? 429 : 400).json({
      ok: false,
      message: usageLimit
        ? 'Cursor usage limit reached'
        : 'Cursor call blocked by PBMP token/cost governance',
      gap: 'GAP-CURSOR-TOKEN-001',
      token_estimate: estimate,
      governance: gate,
    });
  }

  if (!c.apiKey) {
    return res.status(503).json({
      ok: false,
      message:
        'Cursor API is not configured. Set CURSOR_API_KEY in the server environment (Cursor Dashboard → API Keys).',
      gap: 'GAP-CURSOR-API-001',
      config_needed: ['CURSOR_API_KEY', 'CURSOR_REPOSITORY', 'CURSOR_REPO_REF'],
      token_estimate: estimate,
      governance: gate,
    });
  }

  if (!c.repository) {
    return res.status(503).json({
      ok: false,
      message: 'CURSOR_REPOSITORY is required (GitHub repo URL connected to Cursor Cloud Agents).',
      gap: 'GAP-CURSOR-API-001',
      token_estimate: estimate,
      governance: gate,
    });
  }

  const requestBody = {
    prompt: { text: promptText },
    name: requirementId ? `PBMP ${requirementId}` : 'PBMP Cursor Dispatch',
    model,
    repos: [
      {
        url: c.repository,
        startingRef: c.repoRef,
      },
    ],
    autoCreatePR: c.autoCreatePR,
  };

  const ledgerDraft = createCursorRun({
    pbmp_user_id: actor.userId,
    pbmp_user_tier: actor.userTier,
    pbmp_project_id: actor.projectId,
    pbmp_task_id: requirementId || null,
    repo_url: c.repository,
    source_ref: c.repoRef,
    model_requested: model,
    prompt_hash: estimate.prompt_hash,
    estimated_input_tokens: estimate.estimated_input_tokens,
    estimated_output_tokens: estimate.estimated_output_tokens,
    estimated_cost_low: estimate.estimated_cost_usd_low,
    estimated_cost_high: estimate.estimated_cost_usd_high,
    estimated_cost_for_budget: estimate.estimated_cost_usd_high,
    status: 'LAUNCHING',
  });

  try {
    const { res: apiRes, json: apiJson } = await cursorFetch(c.agentsApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!apiRes.ok) {
      const errMsg =
        apiJson?.message
        || apiJson?.error
        || (typeof apiJson?.raw === 'string' ? apiJson.raw.slice(0, 200) : 'Cursor API error');
      updateCursorRun(ledgerDraft.id, {
        status: 'ERROR',
        error_message: String(errMsg),
      });
      return res.status(apiRes.status).json({
        ok: false,
        message:
          apiRes.status === 429
            ? 'Cursor usage limit reached'
            : 'Cursor Cloud Agents API call failed',
        http_status: apiRes.status,
        token_estimate: estimate,
        governance: gate,
        pbmp_run_id: ledgerDraft.id,
        request_summary: {
          url: c.agentsApiUrl,
          repository: c.repository,
          ref: c.repoRef,
          requirement_id: requirementId || null,
          model,
        },
        cursor_response: apiJson,
      });
    }

    const agent = apiJson?.agent || apiJson;
    const runId = apiJson?.run?.id || agent?.latestRunId || null;
    const agentId = agent?.id || null;
    const agentUrl =
      agent?.url || (agentId ? `https://cursor.com/agents/${agentId}` : null);

    updateCursorRun(ledgerDraft.id, {
      cursor_agent_id: agentId,
      cursor_run_id: runId,
      cursor_web_url: agentUrl,
      target_branch: agent?.target?.branchName || agent?.branchName || null,
      status: 'RUNNING',
    });

    return res.json({
      ok: true,
      message: 'Cursor Cloud Agent launched — polling for final output next',
      requirement_ref: 'GAP-CURSOR-TOKEN-001',
      token_estimate: estimate,
      governance: gate,
      pbmp_run_id: ledgerDraft.id,
      request_summary: {
        url: c.agentsApiUrl,
        repository: c.repository,
        ref: c.repoRef,
        requirement_id: requirementId || null,
        model,
        prompt_chars: promptText.length,
      },
      cursor_response: apiJson,
      agent_url: agentUrl,
      agent_id: agentId,
      run_id: runId,
      status_poll_path: agentId
        ? `/api/cursor/agent-run?agent_id=${encodeURIComponent(agentId)}${runId ? `&run_id=${encodeURIComponent(runId)}` : ''}`
        : null,
    });
  } catch (err) {
    updateCursorRun(ledgerDraft.id, {
      status: 'ERROR',
      error_message: err.message,
    });
    return res.status(502).json({
      ok: false,
      message: `Failed to reach Cursor API: ${err.message}`,
      gap: 'GAP-CURSOR-API-001',
      pbmp_run_id: ledgerDraft.id,
    });
  }
});

/**
 * Poll Cursor for agent run status + final assistant result text.
 * GET /api/cursor/agent-run?agent_id=bc-...&run_id=run-...
 */
router.get('/agent-run', async (req, res) => {
  const c = cfg();
  if (!c.apiKey) {
    return res.status(503).json({
      ok: false,
      message: 'CURSOR_API_KEY is not configured',
      gap: 'GAP-CURSOR-API-001',
    });
  }

  const agentId = typeof req.query.agent_id === 'string' ? req.query.agent_id.trim() : '';
  let runId = typeof req.query.run_id === 'string' ? req.query.run_id.trim() : '';

  if (!agentId) {
    return res.status(400).json({ ok: false, message: 'agent_id is required' });
  }

  try {
    if (!runId) {
      const { res: agentRes, json: agentJson } = await cursorFetch(
        `${c.agentsApiUrl}/${encodeURIComponent(agentId)}`,
      );
      if (!agentRes.ok) {
        return res.status(agentRes.status).json({
          ok: false,
          message: 'Failed to fetch Cursor agent',
          cursor_response: agentJson,
        });
      }
      runId = agentJson?.latestRunId || '';
      if (!runId) {
        updateCursorRun(agentId, { status: agentJson?.status || 'WAITING' });
        return res.json({
          ok: true,
          done: false,
          status: agentJson?.status || 'WAITING',
          message: 'Agent exists but no run id yet — keep polling',
          agent_id: agentId,
          run_id: null,
          agent_url: agentJson?.url || `https://cursor.com/agents/${agentId}`,
          output: null,
        });
      }
    }

    const { res: runRes, json: runJson } = await cursorFetch(
      `${c.agentsApiUrl}/${encodeURIComponent(agentId)}/runs/${encodeURIComponent(runId)}`,
    );

    if (!runRes.ok) {
      return res.status(runRes.status).json({
        ok: false,
        message: 'Failed to fetch Cursor run',
        agent_id: agentId,
        run_id: runId,
        cursor_response: runJson,
      });
    }

    const status = runJson?.status || 'UNKNOWN';
    const done = TERMINAL_RUN_STATUSES.has(status);
    const output =
      runJson?.result
      || runJson?.text
      || runJson?.summary
      || null;
    const prUrl =
      runJson?.git?.branches?.[0]?.prUrl
      || runJson?.prUrl
      || null;

    updateCursorRun(agentId, {
      cursor_run_id: runId,
      status,
      pr_url: prUrl,
      target_branch: runJson?.git?.branches?.[0]?.name || undefined,
      error_message: status === 'ERROR' || status === 'EXPIRED' ? String(output || status) : null,
    });

    return res.json({
      ok: true,
      done,
      status,
      agent_id: agentId,
      run_id: runId,
      agent_url: `https://cursor.com/agents/${agentId}`,
      duration_ms: runJson?.durationMs ?? null,
      git: runJson?.git || null,
      pr_url: prUrl,
      output: done ? output : null,
      message: done
        ? status === 'FINISHED'
          ? 'Cursor agent finished — final output below'
          : `Cursor run ended with status ${status}`
        : `Cursor run in progress (${status})`,
      cursor_response: runJson,
    });
  } catch (err) {
    return res.status(502).json({
      ok: false,
      message: `Failed to poll Cursor API: ${err.message}`,
    });
  }
});

export default router;
