# Cursor Integration Architecture

## Do not pipe raw Blockly into Cursor

Unsafe:
```
Blockly workspace JSON → Cursor → code
```

Safe (PBMP control layer):
```
Blockly Requirement Blocks
→ PBMP Requirement JSON
→ PBMP validation and approval
→ Expected Output Contract
→ Cursor Implementation Pack
→ Cursor Cloud Agent API / Headless CLI / MCP
→ Code branch / PR
→ Tests + review + deployment gates
```

## What Cursor should receive

A contract like `cursor-payload-REQ-SALES-001.json`, not only `blockly_workspace`.

Required fields:
- requirement_id, goal, trigger, conditions, actions
- structured_actions (machine-friendly)
- acceptance_criteria, nfrs, out_of_scope
- procedures / functions if defined
- expected_output_contract
- fixed instruction: no invention / gap log on ambiguity

## Hallucination reduction controls

1. Structured Blockly capture  
2. Schema + vocabulary validation  
3. Approved Expected Output Contract  
4. Cursor Rules (`.cursor/rules/pbmp-*.mdc`)  
5. Plan Mode before coding  
6. Test-first from acceptance criteria  
7. CI/CD checks  
8. Human PR review  

## How to use with Cursor today

### A. Manual (IDE)

1. Save & Validate in workbench  
2. Open `cursor-payload-*.json` under `pbmp-implementation-pack/cursor/`  
3. Use `implementation-prompt.md` + rules in IDE  

### B. Automation (Cloud Agents API — Call API button)

Workbench modal → **Call API** calls `POST /api/cursor/call-api`, which launches a Cursor Cloud Agent with:
- the dispatch chat prompt
- the approved `cursor-payload-<REQ>.json` contents

Required env (server):
```bash
CURSOR_API_KEY=...                 # Cursor Dashboard → API Keys
CURSOR_REPOSITORY=https://github.com/Grow24/blocklycursor
CURSOR_REPO_REF=main
CURSOR_AUTO_CREATE_PR=false        # optional
CURSOR_MODEL_DEFAULT=auto
CURSOR_ALLOWED_MODELS=auto,composer,gpt-5-mini
PBMP_CURSOR_MONTHLY_BUDGET_USD=20.00
PBMP_REQUIRE_COST_CONFIRMATION=true
PBMP_ALLOWED_REPOS=Grow24/blocklycursor,Grow24/bpmpcursor
```

If keys are missing, the UI shows a clear config error under the Call API button (`GAP-CURSOR-API-001`).

### Token / cost governance (GAP-CURSOR-TOKEN-001)

PBMP estimates tokens + approximate **cost range** before Cloud Agent launch.
There is no Cursor pre-flight exact-cost API; PBMP must estimate and keep a run ledger.

Flow:
1. Export Cursor Pack → `POST /api/cursor/dispatch` (payload + estimate)
2. Optional: `POST /api/cursor/estimate` (recalculate range)
3. User confirms approximate cost
4. `POST /api/cursor/call-api` with `cost_confirmed: true` (governance gates apply)
5. PBMP stores run in `data/cursor/cursor-runs.json`
6. UI polls `GET /api/cursor/agent-run`

Useful endpoints:
- `GET /api/cursor/config`
- `GET /api/cursor/usage`
- `GET /api/cursor/runs`
- `POST /api/cursor/estimate`
- `POST /api/cursor/call-api`
- `GET /api/cursor/agent-run`

Identity (until auth lands): headers `X-PBMP-User-Id`, `X-PBMP-User-Tier`, `X-PBMP-Project-Id`
or body fields `pbmp_user_id`, `pbmp_user_tier`, `pbmp_project_id`.

### C. CLI / MCP (later / Ops)

- Headless CLI: CI job with API key + pack path  
- MCP: expose approved requirements + EOC as read-only tools  

## PBMP owns truth

```
PBMP owns truth
Blockly captures structured intention
Cursor implements approved work
CI/CD verifies output
Humans approve deviations
```
