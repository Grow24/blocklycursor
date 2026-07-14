/**
 * PBMP Traceability
 * Requirement: REQ-SALES-001
 * Acceptance Criteria: AC-REQ-SALES-001-1
 */
import { createTask, createNotification, listUsers } from './data-store.js';

/**
 * Executes approved structured_actions for a lead workflow context.
 * Supported actions: create_task, send_notification (per REQ-SALES-001 cursor payload).
 */
export function executeStructuredActions(structuredActions, { lead, requirement_id }) {
  const tasks = [];
  const notifications = [];

  for (const action of structuredActions) {
    switch (action.action) {
      case 'create_task': {
        const managers = listUsers({ role: action.assigned_role });
        tasks.push(
          createTask({
            title: action.title,
            assigned_role: action.assigned_role,
            assigned_to: managers[0]?.id || null,
            lead_id: lead.id,
            requirement_id,
          }),
        );
        break;
      }
      case 'send_notification': {
        const managers = listUsers({ role: action.assigned_role });
        if (managers.length === 0) {
          notifications.push(
            createNotification({
              role: action.assigned_role,
              recipient_id: null,
              message: action.message,
              lead_id: lead.id,
              requirement_id,
            }),
          );
        } else {
          for (const manager of managers) {
            notifications.push(
              createNotification({
                role: action.assigned_role,
                recipient_id: manager.id,
                message: action.message,
                lead_id: lead.id,
                requirement_id,
              }),
            );
          }
        }
        break;
      }
      default:
        break;
    }
  }

  return { tasks, notifications };
}
