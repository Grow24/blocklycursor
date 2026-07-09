import { Router } from 'express';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { validateRequirement, requirementToExpectedOutputContract } from '../lib/validator.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PACK_DIR = join(__dirname, '..', '..', 'pbmp-implementation-pack');
const CURSOR_DIR = join(PACK_DIR, 'cursor');
const CURSOR_WEB_CHAT_BASE =
  process.env.CURSOR_WEB_CHAT_URL || 'https://www.cursor.com';

const router = Router();

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

export default router;
