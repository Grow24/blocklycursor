/** Static block → JSON mapping rows for the in-app guide panel. */
export const BLOCK_JSON_MAPPING = [
  { block: 'Requirement ID', fields: 'REQ_ID', requirement: 'requirement_id', cursor: 'requirement_id' },
  { block: 'Goal', fields: 'GOAL_TEXT', requirement: 'goal', cursor: 'goal' },
  { block: 'Actor', fields: 'ACTOR (dropdown)', requirement: 'actor', cursor: '(via expected_output_contract.actors)' },
  { block: 'Trigger / Start', fields: 'TRIGGER', requirement: 'trigger', cursor: 'trigger' },
  { block: 'Condition', fields: 'FIELD, OPERATOR, VALUE', requirement: 'conditions[] / condition', cursor: 'conditions[] / condition' },
  { block: 'Create Task', fields: 'TITLE, ASSIGNED_ROLE', requirement: 'structured_actions[]', cursor: 'structured_actions[]' },
  { block: 'Action', fields: 'ACTION', requirement: 'actions[] + structured_actions[]', cursor: 'actions[] + structured_actions[]' },
  { block: 'Send Notification', fields: 'ROLE, MESSAGE', requirement: 'notifications[] + structured_actions[]', cursor: 'structured_actions[]' },
  { block: 'Data Entity', fields: 'ENTITY (dropdown)', requirement: 'data_entities[]', cursor: '(via expected_output_contract)' },
  { block: 'Business Rule', fields: 'RULE', requirement: 'business_rules[]', cursor: '(via expected_output_contract)' },
  { block: 'Acceptance Criteria', fields: 'AC', requirement: 'acceptance_criteria[]', cursor: 'acceptance_criteria[]' },
  { block: 'NFR', fields: 'NFR_TYPE, NFR_VALUE', requirement: 'nfrs.{type}', cursor: 'nfrs' },
  { block: 'Approval', fields: 'APPROVAL', requirement: 'approvals[]', cursor: '(via expected_output_contract.approved_by)' },
  { block: 'Define Procedure', fields: 'PROC_NAME, PROC_INPUTS, BODY', requirement: 'procedures[]', cursor: 'procedures[]' },
  { block: 'Run Procedure', fields: 'PROC_NAME', requirement: 'procedures[] + actions[]', cursor: 'procedures[]' },
  { block: 'Define Function', fields: 'FUNC_NAME, inputs, returns, BODY', requirement: 'functions[]', cursor: 'functions[]' },
  { block: 'Call Function', fields: 'FUNC_NAME', requirement: 'functions[]', cursor: 'functions[]' },
  { block: '(workspace snapshot)', fields: '—', requirement: 'blockly_workspace', cursor: 'not sent to Cursor' },
];

export const MANUAL_ENTRY_STEPS = [
  'Drag Requirement ID from Start / Trigger toolbox onto the canvas.',
  'Enter a valid ID (e.g. REQ-SALES-001) in the root block.',
  'Drag Goal, Actor, Trigger, Condition, and Action blocks into the root body slot — they must snap as a chain.',
  'Fill text fields and dropdowns on each block (Actor/Entity/Roles use approved vocabulary).',
  'Add at least one Condition block and one action (Create Task, Action, or Notify).',
  'Click Save & Validate — fix any errors shown in the status bar.',
  'Use Export Requirement JSON or Export Cursor Pack to download / dispatch.',
];
