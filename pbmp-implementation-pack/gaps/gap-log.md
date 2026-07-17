# PBMP Gap Log

| gap_id | source_requirement | gap_type | question | status | blocks_stage | owner |
|--------|-------------------|----------|----------|--------|--------------|-------|
| GAP-REQ-SALES-001-01 | REQ-SALES-001 | Missing Business Rule | What happens if the lead has no assigned Sales Manager? | Open | Development | Business Analyst |
| GAP-REQ-SALES-001-02 | REQ-SALES-001 | Out of Scope | User requested full lead management system (pipeline stages, bulk import, CRM integrations). Only REQ-SALES-001 follow-up workflow is approved. | Open | Development | Product Manager |
| GAP-REQ-SALES-001-03 | REQ-SALES-001 | Out of Scope | User requested approval workflow. Approved requirement has `approvals: []` — no human approval steps defined. | Open | Development | Business Analyst |
| GAP-REQ-SALES-001-04 | REQ-SALES-001 | Missing Business Rule | Should a follow-up task be created on every score update above 80, or only when crossing the threshold from ≤80 to >80? | Resolved | Development | Business Analyst |
| GAP-REQ-SALES-001-05 | REQ-SALES-001 | Missing Acceptance Criteria | Structured action includes `send_notification` to Sales Manager, but approved AC list includes only task creation. What is the approved AC ID and expected assertion for notification behavior? | Open | Development | Business Analyst |
| GAP-CURSOR-API-001 | Cursor Integration (Ops) | Missing Ops Config | Call API button needs `CURSOR_API_KEY` + `CURSOR_REPOSITORY` to call Cursor Cloud Agents API. Confirm approved API key source, target GitHub repo URL, and whether autoCreatePR is allowed. | Open | Development | Product Manager / Ops |
| GAP-CURSOR-TOKEN-001 | Cursor Integration (Ops) | Missing Formal Requirement | Token/cost governance (estimate range, run ledger, budgets, trial limits) implemented as Ops controls for shared Cursor Pro wallet. Needs formal Requirement ID + AC approval for production billing/chargeback. | Open | Development | Product Manager / Business Analyst |
| GAP-CURSOR-TOKEN-002 | Cursor Integration (Ops) | Missing Business Rule | No Cursor pre-flight API for exact tokens/cost before run. PBMP uses approximate estimates + monthly reconciliation against Cursor Dashboard/Admin APIs (Teams/Enterprise). Confirm approved reconciliation process. | Open | Development | Ops / Business Analyst |
| GAP-CURSOR-TOKEN-003 | Cursor Integration (Ops) | Missing Data Rule | PBMP auth does not yet map real trial/paid users to Cursor runs. Temporary defaults: `PBMP_DEFAULT_CURSOR_USER_ID` / `X-PBMP-User-Id` header. Confirm approved identity source for chargeback. | Open | Development | Product Manager |
| GAP-EMAIL-001 | Ops / Contact Integration | Missing Formal Requirement | Email template builder + SendGrid send copied from `web/` folder (toolbar widget). Needs formal Requirement ID + AC for production contact/email governance. | Open | Development | Product Manager |

## Template

```json
{
  "gap_id": "GAP-REQ-XXX-01",
  "source_requirement": "REQ-XXX",
  "gap_type": "Missing Data Rule",
  "question": "...",
  "status": "Open",
  "blocks_downstream_stage": "Development",
  "owner": "Business Analyst"
}
```
