# PBMP Traceability Matrix

| Component | Requirement ID | Acceptance Criteria ID |
|-----------|----------------|------------------------|
| `server/lib/data-store.js` | REQ-SALES-001, REQ-SALES-005 | AC-REQ-SALES-001-1, AC-REQ-SALES-005-1 |
| `server/lib/rule-engine.js` | REQ-SALES-001 | AC-REQ-SALES-001-1 |
| `server/lib/rule-engine-sales-005.js` | REQ-SALES-005 | AC-REQ-SALES-005-1 |
| `server/lib/structured-action-executor.js` | REQ-SALES-001, REQ-SALES-005 | AC-REQ-SALES-001-1, AC-REQ-SALES-005-1 |
| `server/data/requirements/REQ-SALES-001.json` | REQ-SALES-001 | — |
| `server/data/requirements/REQ-SALES-005.json` | REQ-SALES-005 | — |
| `server/routes/leads.js` | REQ-SALES-001, REQ-SALES-005 | AC-REQ-SALES-001-1, AC-REQ-SALES-005-1 |
| `server/routes/tasks.js` | REQ-SALES-001, REQ-SALES-005 | AC-REQ-SALES-001-1, AC-REQ-SALES-005-1 |
| `server/routes/notifications.js` | REQ-SALES-001, REQ-SALES-005 | AC-REQ-SALES-001-1, AC-REQ-SALES-005-1 |
| `server/routes/audit.js` | REQ-SALES-001, REQ-SALES-005 | AC-REQ-SALES-001-1, AC-REQ-SALES-005-1 |
| `server/routes/users.js` | REQ-SALES-001, REQ-SALES-005 | — |
| `server/tests/req-sales-001.test.js` | REQ-SALES-001 | AC-REQ-SALES-001-1 |
| `server/tests/req-sales-005.test.js` | REQ-SALES-005 | AC-REQ-SALES-005-1 |
| `client/leads.html` | REQ-SALES-001 | — |
| `client/src/leads/*` | REQ-SALES-001 | — |

## Workflow mapping (approved design) - REQ-SALES-001

| Step | Implementation |
|------|----------------|
| Detect lead score update | `PATCH /api/leads/:id/score` → `onLeadScoreUpdated()` |
| Check lead_score > 80 | `rule-engine.js` condition evaluation |
| Create follow-up task | `createTask()` with title "Follow up with customer" |
| Notify Sales Manager | `createNotification()` to all Sales Manager users |

## Workflow mapping (approved design) - REQ-SALES-005

| Step | Implementation |
|------|----------------|
| Detect lead score update | `PATCH /api/leads/:id/score` → `onLeadScoreUpdatedSales005()` |
| Check lead_score <= 40 | `rule-engine-sales-005.js` condition evaluation |
| Create follow-up task | `createTask()` with title "Follow up with customer" for Product Manager |
| Notify Product Manager | `createNotification()` to all Product Manager users |
