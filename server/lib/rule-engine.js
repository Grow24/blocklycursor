/**
 * PBMP Traceability
 * Requirement: REQ-SALES-001
 * Acceptance Criteria: AC-REQ-SALES-001-1
 */
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { appendAuditEntry } from './data-store.js';
import { executeStructuredActions } from './structured-action-executor.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REQUIREMENT_PATH = join(__dirname, '..', 'data', 'requirements', 'REQ-SALES-001.json');

function loadRequirementConfig() {
  return JSON.parse(readFileSync(REQUIREMENT_PATH, 'utf8'));
}

const REQUIREMENT_CONFIG = loadRequirementConfig();
const REQUIREMENT_ID = REQUIREMENT_CONFIG.requirement_id;
const PRIMARY_CONDITION = REQUIREMENT_CONFIG.condition || REQUIREMENT_CONFIG.conditions?.[0];
const SCORE_THRESHOLD = Number(PRIMARY_CONDITION?.value ?? 80);

function evaluateCondition(field, operator, value, lead) {
  const actual = lead[field];
  const expected = Number(value);
  switch (operator) {
    case '>':
      return Number(actual) > expected;
    case '>=':
      return Number(actual) >= expected;
    case '<':
      return Number(actual) < expected;
    case '<=':
      return Number(actual) <= expected;
    case '==':
    case '=':
      return Number(actual) === expected;
    default:
      return false;
  }
}

/**
 * Executes REQ-SALES-001 when lead score is updated.
 * Actions driven by approved structured_actions from REQ-SALES-001.json.
 * GAP-REQ-SALES-001-04: threshold-crossing per acceptance scenario (79 → 81).
 */
export function onLeadScoreUpdated(lead, previousScore) {
  const condition = PRIMARY_CONDITION;
  const crossedThreshold =
    Number(previousScore) <= SCORE_THRESHOLD && Number(lead.lead_score) > SCORE_THRESHOLD;
  const matchesCondition = evaluateCondition(
    condition.field,
    condition.operator,
    condition.value,
    lead,
  );

  appendAuditEntry({
    action: 'lead_score_updated',
    entity_type: 'lead',
    entity_id: lead.id,
    requirement_id: REQUIREMENT_ID,
    details: {
      previous_score: previousScore,
      new_score: lead.lead_score,
      rule_evaluated: true,
      condition_met: matchesCondition,
      crossed_threshold: crossedThreshold,
    },
  });

  if (!matchesCondition || !crossedThreshold) {
    return { triggered: false, tasks: [], notifications: [] };
  }

  const { tasks, notifications } = executeStructuredActions(
    REQUIREMENT_CONFIG.structured_actions || [],
    { lead, requirement_id: REQUIREMENT_ID },
  );

  return { triggered: true, tasks, notifications };
}

export const RULE_CONFIG = {
  requirement_id: REQUIREMENT_ID,
  trigger: REQUIREMENT_CONFIG.trigger,
  condition: PRIMARY_CONDITION,
  structured_actions: REQUIREMENT_CONFIG.structured_actions || [],
};
