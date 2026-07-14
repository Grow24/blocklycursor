# Use Case: High-score Lead Follow-up

**Source Requirement:** REQ-SALES-001  
**Expected Output Contract:** EOC-SALES-001

## Workflow Steps

| Step | Description | Source |
|------|-------------|--------|
| 1 | Detect lead score update | REQ-SALES-001.trigger |
| 2 | Check lead_score > 80 | REQ-SALES-001.condition |
| 3 | Create follow-up task | REQ-SALES-001.actions[0] |
| 4 | Notify Sales Manager | REQ-SALES-001.actions[1] |

## Rule

No design element without a source Requirement ID.

---

# Use Case: Low-score Lead Follow-up

**Source Requirement:** REQ-SALES-005  
**Expected Output Contract:** EOC-SALES-005

## Workflow Steps

| Step | Description | Source |
|------|-------------|--------|
| 1 | Detect lead score update | REQ-SALES-005.trigger |
| 2 | Check lead_score <= 40 | REQ-SALES-005.condition |
| 3 | Create task "Follow up with customer" | REQ-SALES-005.structured_actions[0] |
| 4 | Notify Product Manager | REQ-SALES-005.structured_actions[1] |

## Rule

No design element without a source Requirement ID.
