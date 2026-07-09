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
