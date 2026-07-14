import { Router } from 'express';
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { validateRequirement, requirementToExpectedOutputContract } from '../lib/validator.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PACK_DIR = join(__dirname, '..', '..', 'pbmp-implementation-pack');
const CURSOR_DIR = join(PACK_DIR, 'cursor');
const CURSOR_WEB_CHAT_BASE =
  process.env.CURSOR_WEB_CHAT_URL || 'https://www.cursor.com';
const CURSOR_AGENTS_API_BASE =
  process.env.CURSOR_AGENTS_API_URL || 'https://api.cursor.com/v1/agents';
const CURSOR_API_KEY = process.env.CURSOR_API_KEY || '';
const CURSOR_REPOSITORY =
  process.env.CURSOR_REPOSITORY || 'https://github.com/Grow24/blocklycursor';
const CURSOR_REPO_REF = process.env.CURSOR_REPO_REF || 'main';
const CURSOR_AUTO_CREATE_PR = process.env.CURSOR_AUTO_CREATE_PR === 'true';

const TERMINAL_RUN_STATUSES = new Set(['FINISHED', 'ERROR', 'CANCELLED', 'EXPIRED']);

const router = Router();

function cursorAuthHeader() {
  return `Basic ${Buffer.from(`${CURSOR_API_KEY}:`).toString('base64')}`;
}

async function cursorFetch(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: cursorAuthHeader(),
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
  const deepLink = `cursor://chat/new?prompt=${encodeURIComponent(chatPrompt)}`;
  const webChatUrl = `${CURSOR_WEB_CHAT_BASE}?prompt=${encodeURIComponent(chatPrompt)}`;

  return res.json({
    ok: true,
    message: 'Cursor payload generated and dispatch prepared',
    payload_file: `pbmp-implementation-pack/cursor/${payloadFile}`,
    chat_prompt: chatPrompt,
    cursor_deeplink: deepLink,
    cursor_web_url: webChatUrl,
    note: 'Deep link support depends on local Cursor app URL-handler setup.',
  });
});

/**
 * Calls Cursor Cloud Agents API with the dispatch prompt + approved payload.
 * Requires CURSOR_API_KEY and a connected GitHub repository.
 */
router.post('/call-api', async (req, res) => {
  const chatPrompt = typeof req.body?.chat_prompt === 'string' ? req.body.chat_prompt.trim() : '';
  const requirementId = typeof req.body?.requirement_id === 'string' ? req.body.requirement_id.trim() : '';

  if (!chatPrompt) {
    return res.status(400).json({
      ok: false,
      message: 'chat_prompt is required (use the Cursor Dispatch Ready prompt text)',
    });
  }

  if (!CURSOR_API_KEY) {
    return res.status(503).json({
      ok: false,
      message:
        'Cursor API is not configured. Set CURSOR_API_KEY in the server environment (Cursor Dashboard → API Keys).',
      gap: 'GAP-CURSOR-API-001',
      config_needed: ['CURSOR_API_KEY', 'CURSOR_REPOSITORY', 'CURSOR_REPO_REF'],
    });
  }

  if (!CURSOR_REPOSITORY) {
    return res.status(503).json({
      ok: false,
      message: 'CURSOR_REPOSITORY is required (GitHub repo URL connected to Cursor Cloud Agents).',
      gap: 'GAP-CURSOR-API-001',
    });
  }

  let payloadJson = null;
  if (requirementId) {
    const payloadPath = join(CURSOR_DIR, `cursor-payload-${requirementId}.json`);
    if (existsSync(payloadPath)) {
      try {
        payloadJson = JSON.parse(readFileSync(payloadPath, 'utf8'));
      } catch {
        payloadJson = null;
      }
    }
  }

  const promptText = [
    chatPrompt,
    '',
    'APPROVED CURSOR PAYLOAD (source of truth — do not invent beyond this):',
    payloadJson ? JSON.stringify(payloadJson, null, 2) : '(payload file not found on server — use chat_prompt only)',
  ].join('\n');

  const requestBody = {
    prompt: { text: promptText },
    name: requirementId ? `PBMP ${requirementId}` : 'PBMP Cursor Dispatch',
    repos: [
      {
        url: CURSOR_REPOSITORY,
        startingRef: CURSOR_REPO_REF,
      },
    ],
    autoCreatePR: CURSOR_AUTO_CREATE_PR,
  };

  try {
    const { res: apiRes, json: apiJson } = await cursorFetch(CURSOR_AGENTS_API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!apiRes.ok) {
      return res.status(apiRes.status).json({
        ok: false,
        message: 'Cursor Cloud Agents API call failed',
        http_status: apiRes.status,
        request_summary: {
          url: CURSOR_AGENTS_API_BASE,
          repository: CURSOR_REPOSITORY,
          ref: CURSOR_REPO_REF,
          requirement_id: requirementId || null,
        },
        cursor_response: apiJson,
      });
    }

    const agent = apiJson?.agent || apiJson;
    const runId = apiJson?.run?.id || agent?.latestRunId || null;
    const agentId = agent?.id || null;
    const agentUrl =
      agent?.url || (agentId ? `https://cursor.com/agents/${agentId}` : null);

    return res.json({
      ok: true,
      message: 'Cursor Cloud Agent launched — polling for final output next',
      request_summary: {
        url: CURSOR_AGENTS_API_BASE,
        repository: CURSOR_REPOSITORY,
        ref: CURSOR_REPO_REF,
        requirement_id: requirementId || null,
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
    return res.status(502).json({
      ok: false,
      message: `Failed to reach Cursor API: ${err.message}`,
      gap: 'GAP-CURSOR-API-001',
    });
  }
});

/**
 * Poll Cursor for agent run status + final assistant result text.
 * GET /api/cursor/agent-run?agent_id=bc-...&run_id=run-...
 */
router.get('/agent-run', async (req, res) => {
  if (!CURSOR_API_KEY) {
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
        `${CURSOR_AGENTS_API_BASE}/${encodeURIComponent(agentId)}`,
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
      `${CURSOR_AGENTS_API_BASE}/${encodeURIComponent(agentId)}/runs/${encodeURIComponent(runId)}`,
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
      runJson?.result ||
      runJson?.text ||
      runJson?.summary ||
      null;

    return res.json({
      ok: true,
      done,
      status,
      agent_id: agentId,
      run_id: runId,
      agent_url: `https://cursor.com/agents/${agentId}`,
      duration_ms: runJson?.durationMs ?? null,
      git: runJson?.git || null,
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
