import * as Blockly from 'blockly';

const PBMP_COLORS = {
  goal: 210,
  actor: 160,
  trigger: 45,
  condition: 30,
  action: 120,
  data: 260,
  rule: 290,
  nfr: 0,
  acceptance: 60,
  approval: 330,
  output: 200,
  procedure: 240,
  notify: 290,
};

const ROLE_OPTIONS = [
  ['Sales Manager', 'Sales Manager'],
  ['Business Owner', 'Business Owner'],
  ['Product Manager', 'Product Manager'],
  ['Customer', 'Customer'],
  ['System', 'System'],
  ['Sales Director', 'Sales Director'],
];

const ENTITY_OPTIONS = [
  ['Lead', 'Lead'],
  ['Task', 'Task'],
  ['User', 'User'],
  ['AuditLog', 'AuditLog'],
  ['Invoice', 'Invoice'],
  ['Customer', 'Customer'],
];

const OPERATOR_OPTIONS = [
  ['>', '>'],
  ['>=', '>='],
  ['<', '<'],
  ['<=', '<='],
  ['=', '='],
  ['!=', '!='],
];

const NFR_TYPE_OPTIONS = [
  ['performance', 'performance'],
  ['auditability', 'auditability'],
  ['security', 'security'],
  ['availability', 'availability'],
];

function registerBlock(type, { message, colour, output, previous = true, next = true, fields }) {
  Blockly.Blocks[type] = {
    init() {
      const input = this.appendDummyInput();
      if (fields) {
        fields.forEach((f) => {
          if (f.type === 'label') input.appendField(f.label);
          if (f.type === 'text') {
            input.appendField(new Blockly.FieldTextInput(f.default || ''), f.name);
          }
          if (f.type === 'dropdown') {
            input.appendField(new Blockly.FieldDropdown(f.options), f.name);
          }
        });
      } else {
        input.appendField(message);
      }
      this.setColour(colour);
      if (output) this.setOutput(true, output === true ? null : output);
      if (!output && previous) this.setPreviousStatement(true, 'PBMP_STMT');
      if (!output && next) this.setNextStatement(true, 'PBMP_STMT');
      this.setTooltip(type);
    },
  };
}

export function registerPbmpBlocks() {
  Blockly.Blocks['pbmp_requirement_root'] = {
    init() {
      this.appendDummyInput()
        .appendField('Requirement ID')
        .appendField(new Blockly.FieldTextInput('REQ-SALES-001'), 'REQ_ID');
      this.appendStatementInput('BODY').setCheck('PBMP_STMT');
      this.setColour(20);
      this.setDeletable(false);
      this.setTooltip('Root block for one PBMP requirement');
    },
  };

  registerBlock('pbmp_goal', {
    colour: PBMP_COLORS.goal,
    fields: [
      { type: 'label', label: 'Goal' },
      { type: 'text', name: 'GOAL_TEXT', default: 'Improve lead follow-up' },
    ],
  });

  registerBlock('pbmp_actor', {
    colour: PBMP_COLORS.actor,
    fields: [
      { type: 'label', label: 'Actor' },
      { type: 'dropdown', name: 'ACTOR', options: ROLE_OPTIONS },
    ],
  });

  registerBlock('pbmp_trigger', {
    colour: PBMP_COLORS.trigger,
    fields: [
      { type: 'label', label: 'Trigger / Start' },
      { type: 'text', name: 'TRIGGER', default: 'Lead score updated' },
    ],
  });

  registerBlock('pbmp_condition', {
    colour: PBMP_COLORS.condition,
    fields: [
      { type: 'label', label: 'Condition' },
      { type: 'text', name: 'FIELD', default: 'lead_score' },
      { type: 'dropdown', name: 'OPERATOR', options: OPERATOR_OPTIONS },
      { type: 'text', name: 'VALUE', default: '80' },
    ],
  });

  Blockly.Blocks['pbmp_conditions_list'] = {
    init() {
      this.appendDummyInput().appendField('Multiple Conditions (stack below)');
      this.appendStatementInput('CONDITIONS').setCheck('PBMP_STMT');
      this.setColour(PBMP_COLORS.condition);
      this.setPreviousStatement(true, 'PBMP_STMT');
      this.setNextStatement(true, 'PBMP_STMT');
    },
  };

  // Structured Create Task block (user-facing + machine action)
  registerBlock('pbmp_create_task', {
    colour: PBMP_COLORS.action,
    fields: [
      { type: 'label', label: 'Create Task' },
      { type: 'text', name: 'TITLE', default: 'Follow up with customer' },
      { type: 'label', label: 'for role' },
      { type: 'dropdown', name: 'ASSIGNED_ROLE', options: ROLE_OPTIONS },
    ],
  });

  registerBlock('pbmp_action', {
    colour: PBMP_COLORS.action,
    fields: [
      { type: 'label', label: 'Action' },
      { type: 'text', name: 'ACTION', default: 'Create follow-up task' },
    ],
  });

  Blockly.Blocks['pbmp_actions_list'] = {
    init() {
      this.appendDummyInput().appendField('Multiple Actions (stack below)');
      this.appendStatementInput('ACTIONS').setCheck('PBMP_STMT');
      this.setColour(PBMP_COLORS.action);
      this.setPreviousStatement(true, 'PBMP_STMT');
      this.setNextStatement(true, 'PBMP_STMT');
    },
  };

  registerBlock('pbmp_notify', {
    colour: PBMP_COLORS.notify,
    fields: [
      { type: 'label', label: 'Send Notification to' },
      { type: 'dropdown', name: 'ROLE', options: ROLE_OPTIONS },
      { type: 'label', label: 'message' },
      { type: 'text', name: 'MESSAGE', default: 'High-score lead needs follow-up' },
    ],
  });

  registerBlock('pbmp_data_entity', {
    colour: PBMP_COLORS.data,
    fields: [
      { type: 'label', label: 'Data Entity' },
      { type: 'dropdown', name: 'ENTITY', options: ENTITY_OPTIONS },
    ],
  });

  registerBlock('pbmp_business_rule', {
    colour: PBMP_COLORS.rule,
    fields: [
      { type: 'label', label: 'Business Rule' },
      { type: 'text', name: 'RULE', default: 'High-score leads require follow-up' },
    ],
  });

  registerBlock('pbmp_acceptance', {
    colour: PBMP_COLORS.acceptance,
    fields: [
      { type: 'label', label: 'Acceptance Criteria' },
      { type: 'text', name: 'AC', default: 'Given score > 80, then task is created' },
    ],
  });

  registerBlock('pbmp_nfr', {
    colour: PBMP_COLORS.nfr,
    fields: [
      { type: 'label', label: 'NFR' },
      { type: 'dropdown', name: 'NFR_TYPE', options: NFR_TYPE_OPTIONS },
      { type: 'label', label: ':' },
      { type: 'text', name: 'NFR_VALUE', default: 'Complete within 3 seconds' },
    ],
  });

  registerBlock('pbmp_approval', {
    colour: PBMP_COLORS.approval,
    fields: [
      { type: 'label', label: 'Approval required from' },
      { type: 'dropdown', name: 'APPROVAL', options: ROLE_OPTIONS },
    ],
  });

  registerBlock('pbmp_output', {
    colour: PBMP_COLORS.output,
    fields: [
      { type: 'label', label: 'Output / Traceability' },
      { type: 'text', name: 'OUTPUT', default: 'REQ-ID mapping' },
    ],
  });

  // Procedure = reusable actions package (does work)
  Blockly.Blocks['pbmp_procedure_def'] = {
    init() {
      this.appendDummyInput()
        .appendField('Define Procedure')
        .appendField(new Blockly.FieldTextInput('Check High-Value Deal Approval'), 'PROC_NAME');
      this.appendDummyInput()
        .appendField('needs')
        .appendField(new Blockly.FieldTextInput('Deal Amount, Customer Type, Risk Score'), 'PROC_INPUTS');
      this.appendStatementInput('BODY').setCheck('PBMP_STMT').appendField('do');
      this.setColour(PBMP_COLORS.procedure);
      this.setPreviousStatement(true, 'PBMP_STMT');
      this.setNextStatement(true, 'PBMP_STMT');
      this.setTooltip('Reusable business procedure — define once, call anywhere');
    },
  };

  registerBlock('pbmp_procedure_call', {
    colour: PBMP_COLORS.procedure,
    fields: [
      { type: 'label', label: 'Run Procedure' },
      {
        type: 'text',
        name: 'PROC_NAME',
        default: 'Check High-Value Deal Approval',
      },
    ],
  });

  // Function = returns a value / answer
  Blockly.Blocks['pbmp_function_def'] = {
    init() {
      this.appendDummyInput()
        .appendField('Define Function')
        .appendField(new Blockly.FieldTextInput('Calculate Lead Score'), 'FUNC_NAME');
      this.appendDummyInput()
        .appendField('inputs')
        .appendField(new Blockly.FieldTextInput('Lead, Engagement'), 'FUNC_INPUTS');
      this.appendDummyInput()
        .appendField('returns')
        .appendField(new Blockly.FieldTextInput('number score'), 'FUNC_RETURNS');
      this.appendStatementInput('BODY').setCheck('PBMP_STMT').appendField('logic');
      this.setColour(PBMP_COLORS.procedure);
      this.setPreviousStatement(true, 'PBMP_STMT');
      this.setNextStatement(true, 'PBMP_STMT');
      this.setTooltip('Reusable function that returns a value/answer');
    },
  };

  Blockly.Blocks['pbmp_function_call'] = {
    init() {
      this.appendDummyInput()
        .appendField('Call Function')
        .appendField(new Blockly.FieldTextInput('Calculate Lead Score'), 'FUNC_NAME');
      this.setOutput(true, null);
      this.setColour(PBMP_COLORS.procedure);
      this.setTooltip('Use function result as a value');
    },
  };
}
