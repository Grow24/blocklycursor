import * as Blockly from 'blockly';

function collectBlocksOfType(workspace, type) {
  return workspace.getAllBlocks(false).filter((b) => b.type === type);
}

function getFieldValue(block, name) {
  return block.getFieldValue(name) || '';
}

function walkStatementChain(startBlock, visitor) {
  let current = startBlock;
  while (current) {
    visitor(current);
    current = current.getNextBlock();
  }
}

function collectNestedStatements(startBlock) {
  const items = [];
  walkStatementChain(startBlock, (block) => {
    items.push({
      type: block.type,
      fields: Object.fromEntries(
        block.inputList
          .flatMap((input) => input.fieldRow || [])
          .filter((f) => f.name)
          .map((f) => [f.name, f.getValue()]),
      ),
    });
  });
  return items;
}

/**
 * Converts friendly Blockly blocks into structured PBMP Requirement JSON.
 * Downstream Design / Development / Cursor receive this — not raw Blockly XML.
 */
export function exportRequirementJson(workspace) {
  const roots = collectBlocksOfType(workspace, 'pbmp_requirement_root');
  const root = roots[0];
  if (!root) {
    throw new Error('Add a "Requirement ID" root block to the workspace.');
  }

  const requirementId = getFieldValue(root, 'REQ_ID');
  const bodyStart = root.getInputTargetBlock('BODY');

  const data = {
    requirement_id: requirementId,
    goal: '',
    actor: '',
    trigger: '',
    condition: null,
    conditions: [],
    actions: [],
    structured_actions: [],
    data_entities: [],
    business_rules: [],
    acceptance_criteria: [],
    nfrs: {},
    approvals: [],
    outputs: [],
    notifications: [],
    procedures: [],
    functions: [],
    out_of_scope: [],
    status: 'Draft',
    blockly_workspace: Blockly.serialization.workspaces.save(workspace),
  };

  walkStatementChain(bodyStart, (block) => {
    switch (block.type) {
      case 'pbmp_goal':
        data.goal = getFieldValue(block, 'GOAL_TEXT');
        break;
      case 'pbmp_actor':
        data.actor = getFieldValue(block, 'ACTOR');
        break;
      case 'pbmp_trigger':
        data.trigger = getFieldValue(block, 'TRIGGER');
        break;
      case 'pbmp_condition':
        data.conditions.push({
          field: getFieldValue(block, 'FIELD'),
          operator: getFieldValue(block, 'OPERATOR') || '>',
          value: getFieldValue(block, 'VALUE'),
        });
        break;
      case 'pbmp_create_task': {
        const title = getFieldValue(block, 'TITLE');
        const role = getFieldValue(block, 'ASSIGNED_ROLE');
        data.actions.push(`Create task "${title}" for role ${role}`);
        data.structured_actions.push({
          action: 'create_task',
          title,
          assigned_role: role,
        });
        break;
      }
      case 'pbmp_action':
        data.actions.push(getFieldValue(block, 'ACTION'));
        data.structured_actions.push({
          action: 'generic',
          description: getFieldValue(block, 'ACTION'),
        });
        break;
      case 'pbmp_notify': {
        const role = getFieldValue(block, 'ROLE');
        const message = getFieldValue(block, 'MESSAGE');
        data.notifications.push({ role, message });
        data.actions.push(`Notify ${role}: ${message}`);
        data.structured_actions.push({
          action: 'send_notification',
          assigned_role: role,
          message,
        });
        break;
      }
      case 'pbmp_data_entity':
        data.data_entities.push(getFieldValue(block, 'ENTITY'));
        break;
      case 'pbmp_business_rule':
        data.business_rules.push(getFieldValue(block, 'RULE'));
        break;
      case 'pbmp_acceptance':
        data.acceptance_criteria.push(getFieldValue(block, 'AC'));
        break;
      case 'pbmp_nfr':
        data.nfrs[getFieldValue(block, 'NFR_TYPE')] = getFieldValue(block, 'NFR_VALUE');
        break;
      case 'pbmp_approval':
        data.approvals.push(getFieldValue(block, 'APPROVAL'));
        break;
      case 'pbmp_output':
        data.outputs.push(getFieldValue(block, 'OUTPUT'));
        break;
      case 'pbmp_procedure_def':
        data.procedures.push({
          kind: 'procedure',
          name: getFieldValue(block, 'PROC_NAME'),
          inputs: getFieldValue(block, 'PROC_INPUTS'),
          body: collectNestedStatements(block.getInputTargetBlock('BODY')),
        });
        break;
      case 'pbmp_procedure_call':
        data.procedures.push({
          kind: 'procedure_call',
          name: getFieldValue(block, 'PROC_NAME'),
        });
        data.actions.push(`Run procedure: ${getFieldValue(block, 'PROC_NAME')}`);
        break;
      case 'pbmp_function_def':
        data.functions.push({
          kind: 'function',
          name: getFieldValue(block, 'FUNC_NAME'),
          inputs: getFieldValue(block, 'FUNC_INPUTS'),
          returns: getFieldValue(block, 'FUNC_RETURNS'),
          body: collectNestedStatements(block.getInputTargetBlock('BODY')),
        });
        break;
      default:
        break;
    }
  });

  // Also collect standalone function-call blocks (value blocks)
  collectBlocksOfType(workspace, 'pbmp_function_call').forEach((block) => {
    data.functions.push({
      kind: 'function_call',
      name: getFieldValue(block, 'FUNC_NAME'),
    });
  });

  if (data.conditions.length === 1) {
    data.condition = data.conditions[0];
  }

  return data;
}

/**
 * Cursor-ready contract: never send raw Blockly workspace alone.
 * This is what Cloud Agents API / Headless CLI / MCP should consume.
 */
export function toCursorImplementationPayload(requirement, eoc = null) {
  return {
    source: 'PBMP_Product_Discovery',
    instruction:
      'Implement only the approved PBMP contract. Do not invent requirements, fields, APIs, roles, screens, workflows, or business rules. If something is missing, create a Gap Log entry instead of guessing.',
    requirement_id: requirement.requirement_id,
    goal: requirement.goal,
    trigger: requirement.trigger,
    condition: requirement.condition,
    conditions: requirement.conditions,
    actions: requirement.actions,
    structured_actions: requirement.structured_actions,
    acceptance_criteria: requirement.acceptance_criteria,
    nfrs: requirement.nfrs,
    out_of_scope: requirement.out_of_scope || [],
    procedures: requirement.procedures,
    functions: requirement.functions,
    expected_output_contract: eoc,
    pipeline: [
      'Blockly Requirement Blocks',
      'PBMP Requirement JSON',
      'PBMP validation and approval',
      'Expected Output Contract',
      'Cursor Implementation Pack',
      'Cursor Cloud Agent API / Headless CLI / MCP',
      'Code branch / PR',
      'Tests + review + deployment gates',
    ],
  };
}

export function downloadJson(filename, obj) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
