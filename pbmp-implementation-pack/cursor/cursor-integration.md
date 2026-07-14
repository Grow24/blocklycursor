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
```

If keys are missing, the UI shows a clear config error under the Call API button (`GAP-CURSOR-API-001`).

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
