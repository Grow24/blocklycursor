# PBMP Cursor Implementation Prompt

## SOURCE OF TRUTH

Use only:

- `pbmp-implementation-pack/cursor/cursor-payload-<REQ>.json` (preferred)
- `pbmp-implementation-pack/requirements/approved-requirements.json`
- `pbmp-implementation-pack/design/approved-design.md`
- `pbmp-implementation-pack/tests/acceptance-criteria.feature`
- `.cursor/rules/*.mdc`
- `pbmp-implementation-pack/cursor/cursor-integration.md`

## PIPELINE REMINDER

```
Blockly → PBMP Requirement JSON → Validation → EOC → Cursor Pack
→ Cloud Agents API / Headless CLI / MCP → PR → Tests → Review → Deploy
```

Do **not** treat raw Blockly workspace JSON as the source of truth.

## TASK

Implement the requirement_id in the approved cursor payload exactly as specified.

## STRICT RULES

1. Do not invent requirements, fields, APIs, screens, roles, workflows, or business rules.
2. Prefer `structured_actions` for machine-accurate action semantics.
3. Every change must reference Requirement ID and Acceptance Criteria ID.
4. Missing info → update `pbmp-implementation-pack/gaps/gap-log.md`.
5. Produce a plan before coding; wait for approval on large changes.
6. Run lint, typecheck, build, tests before completion.

## SUCCESS CRITERIA

- All AC-* scenarios pass
- Traceability matrix updated
- Deviation report produced
- No unapproved assumptions
