/**
 * PBMP Traceability
 * Requirement: REQ-SALES-001
 * Acceptance Criteria: AC-REQ-SALES-001-1
 */
import {
  createTask,
  createNotification,
  listUsers,
  appendAuditEntry,
} from './data-store.js';

const REQUIREMENT_ID = 'REQ-SALES-001';
const SCORE_THRESHOLD = 80;
const TASK_TITLE = 'Follow up with customer';
const ASSIGNED_ROLE = 'Sales Manager';
const NOTIFICATION_MESSAGE = 'High-score lead needs follow-up';

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
 * Creates task + notification only when score crosses threshold (≤80 → >80).
 * GAP-REQ-SALES-001-04: threshold-crossing per acceptance scenario (79 → 81).
 */
export function onLeadScoreUpdated(lead, previousScore) {
  const condition = { field: 'lead_score', operator: '>', value: String(SCORE_THRESHOLD) };
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

  const managers = listUsers({ role: ASSIGNED_ROLE });
  const primaryManager = managers[0] || null;

  const task = createTask({
    title: TASK_TITLE,
    assigned_role: ASSIGNED_ROLE,
    assigned_to: primaryManager?.id || null,
    lead_id: lead.id,
    requirement_id: REQUIREMENT_ID,
  });

  const notifications = [];
  if (managers.length === 0) {
    notifications.push(
      createNotification({
        role: ASSIGNED_ROLE,
        recipient_id: null,
        message: NOTIFICATION_MESSAGE,
        lead_id: lead.id,
        requirement_id: REQUIREMENT_ID,
      }),
    );
  } else {
    for (const manager of managers) {
      notifications.push(
        createNotification({
          role: ASSIGNED_ROLE,
          recipient_id: manager.id,
          message: NOTIFICATION_MESSAGE,
          lead_id: lead.id,
          requirement_id: REQUIREMENT_ID,
        }),
      );
    }
  }

  return { triggered: true, tasks: [task], notifications };
}

export const RULE_CONFIG = {
  requirement_id: REQUIREMENT_ID,
  trigger: 'Lead score updated',
  condition: { field: 'lead_score', operator: '>', value: String(SCORE_THRESHOLD) },
  structured_actions: [
    { action: 'create_task', title: TASK_TITLE, assigned_role: ASSIGNED_ROLE },
    { action: 'send_notification', assigned_role: ASSIGNED_ROLE, message: NOTIFICATION_MESSAGE },
  ],
};
