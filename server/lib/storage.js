import { mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.PBMP_DATA_DIR || join(process.cwd(), 'data', 'requirements');
const PACK_DIR = join(__dirname, '..', '..', 'pbmp-implementation-pack');

export function ensureDataDir() {
  mkdirSync(DATA_DIR, { recursive: true });
}

export function saveRequirement(requirement) {
  ensureDataDir();
  const filePath = join(DATA_DIR, `${requirement.requirement_id}.json`);
  const payload = {
    ...requirement,
    status: 'Validated',
    saved_at: new Date().toISOString(),
  };
  writeFileSync(filePath, JSON.stringify(payload, null, 2));
  return payload;
}

export function listRequirements() {
  ensureDataDir();
  if (!existsSync(DATA_DIR)) return [];
  return readdirSync(DATA_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => {
      const content = JSON.parse(readFileSync(join(DATA_DIR, f), 'utf8'));
      return {
        requirement_id: content.requirement_id,
        goal: content.goal,
        status: content.status,
        saved_at: content.saved_at,
      };
    });
}

export function getRequirement(id) {
  const filePath = join(DATA_DIR, `${id}.json`);
  if (!existsSync(filePath)) return null;
  return JSON.parse(readFileSync(filePath, 'utf8'));
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

export function exportImplementationPack(requirement, eoc) {
  const reqDir = join(PACK_DIR, 'requirements');
  const cursorDir = join(PACK_DIR, 'cursor');
  mkdirSync(reqDir, { recursive: true });
  mkdirSync(cursorDir, { recursive: true });

  const approvedPath = join(reqDir, 'approved-requirements.json');
  let existing = [];
  if (existsSync(approvedPath)) {
    existing = JSON.parse(readFileSync(approvedPath, 'utf8'));
  }
  const filtered = existing.filter((r) => r.requirement_id !== requirement.requirement_id);
  filtered.push(requirement);
  writeFileSync(approvedPath, JSON.stringify(filtered, null, 2));

  const eocPath = join(PACK_DIR, 'requirements', `${eoc.expected_output_contract_id}.json`);
  writeFileSync(eocPath, JSON.stringify(eoc, null, 2));

  const cursorPayload = buildCursorPayload(requirement, eoc);
  const cursorPayloadPath = join(cursorDir, `cursor-payload-${requirement.requirement_id}.json`);
  writeFileSync(cursorPayloadPath, JSON.stringify(cursorPayload, null, 2));

  return { approvedPath, eocPath, cursorPayloadPath };
}
