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
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadReqSales001Contract() {
  const payloadPath = join(
    __dirname,
    '..',
    '..',
    'pbmp-implementation-pack',
    'cursor',
    'cursor-payload-REQ-SALES-001.json',
  );
  const payload = JSON.parse(readFileSync(payloadPath, 'utf8'));

  const condition = payload.conditions?.[0] || payload.condition;
  const createTaskAction = payload.structured_actions?.find((item) => item.action === 'create_task');
  const sendNotificationAction = payload.structured_actions?.find(
    (item) => item.action === 'send_notification',
  );

  if (
    !payload.requirement_id ||
    !payload.trigger ||
    !condition?.field ||
    !condition?.operator ||
    condition.value === undefined ||
    !createTaskAction?.title ||
    !createTaskAction?.assigned_role ||
    !sendNotificationAction?.assigned_role ||
    !sendNotificationAction?.message
  ) {
    throw new Error('REQ-SALES-001 contract is incomplete in cursor payload');
  }

  return {
    requirementId: payload.requirement_id,
    trigger: payload.trigger,
    condition,
    createTaskAction,
    sendNotificationAction,
  };
}

const CONTRACT = loadReqSales001Contract();
const REQUIREMENT_ID = CONTRACT.requirementId;
const TRIGGER = CONTRACT.trigger;
const CONDITION = CONTRACT.condition;
const CREATE_TASK_ACTION = CONTRACT.createTaskAction;
const SEND_NOTIFICATION_ACTION = CONTRACT.sendNotificationAction;

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
 * Trigger: Lead score updated; Condition: lead_score > 80.
 */
export function onLeadScoreUpdated(lead, previousScore) {
  const matchesCondition = evaluateCondition(
    CONDITION.field,
    CONDITION.operator,
    CONDITION.value,
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
    },
  });

  if (!matchesCondition) {
    return { triggered: false, tasks: [], notifications: [] };
  }

  const managers = listUsers({ role: CREATE_TASK_ACTION.assigned_role });
  const primaryManager = managers[0] || null;

  const task = createTask({
    title: CREATE_TASK_ACTION.title,
    assigned_role: CREATE_TASK_ACTION.assigned_role,
    assigned_to: primaryManager?.id || null,
    lead_id: lead.id,
    requirement_id: REQUIREMENT_ID,
  });

  const notifications = managers.map((manager) =>
    createNotification({
      role: SEND_NOTIFICATION_ACTION.assigned_role,
      recipient_id: manager.id,
      message: SEND_NOTIFICATION_ACTION.message,
      lead_id: lead.id,
      requirement_id: REQUIREMENT_ID,
    }),
  );

  return { triggered: true, tasks: [task], notifications };
}

export const RULE_CONFIG = {
  requirement_id: REQUIREMENT_ID,
  trigger: TRIGGER,
  condition: CONDITION,
  structured_actions: [
    {
      action: 'create_task',
      title: CREATE_TASK_ACTION.title,
      assigned_role: CREATE_TASK_ACTION.assigned_role,
    },
    {
      action: 'send_notification',
      assigned_role: SEND_NOTIFICATION_ACTION.assigned_role,
      message: SEND_NOTIFICATION_ACTION.message,
    },
  ],
};
