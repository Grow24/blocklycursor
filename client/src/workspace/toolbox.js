export const toolbox = {
  kind: 'categoryToolbox',
  contents: [
    {
      kind: 'search',
      name: 'Search',
      contents: [],
    },
    {
      kind: 'category',
      name: 'Start / Trigger',
      colour: '#5C81A6',
      contents: [
        { kind: 'block', type: 'pbmp_requirement_root' },
        { kind: 'block', type: 'pbmp_goal' },
        { kind: 'block', type: 'pbmp_actor' },
        { kind: 'block', type: 'pbmp_trigger' },
        { kind: 'block', type: 'pbmp_output' },
      ],
    },
    {
      kind: 'category',
      name: 'Conditions',
      colour: '#5CA65C',
      contents: [
        { kind: 'block', type: 'pbmp_condition' },
        { kind: 'block', type: 'pbmp_conditions_list' },
        { kind: 'block', type: 'pbmp_business_rule' },
      ],
    },
    {
      kind: 'category',
      name: 'Actions',
      colour: '#5CA68D',
      contents: [
        { kind: 'block', type: 'pbmp_create_task' },
        { kind: 'block', type: 'pbmp_action' },
        { kind: 'block', type: 'pbmp_actions_list' },
        { kind: 'block', type: 'pbmp_notify' },
      ],
    },
    {
      kind: 'category',
      name: 'Approvals',
      colour: '#A65C81',
      contents: [{ kind: 'block', type: 'pbmp_approval' }],
    },
    {
      kind: 'category',
      name: 'Data',
      colour: '#745CA6',
      contents: [{ kind: 'block', type: 'pbmp_data_entity' }],
    },
    {
      kind: 'category',
      name: 'Notifications',
      colour: '#A65CA0',
      contents: [{ kind: 'block', type: 'pbmp_notify' }],
    },
    {
      kind: 'category',
      name: 'Acceptance Criteria',
      colour: '#A68D5C',
      contents: [{ kind: 'block', type: 'pbmp_acceptance' }],
    },
    {
      kind: 'category',
      name: 'NFRs',
      colour: '#A65C5C',
      contents: [{ kind: 'block', type: 'pbmp_nfr' }],
    },
    {
      kind: 'category',
      name: 'Procedures / Functions',
      colour: '#5C6BA6',
      contents: [
        { kind: 'block', type: 'pbmp_procedure_def' },
        { kind: 'block', type: 'pbmp_procedure_call' },
        { kind: 'block', type: 'pbmp_function_def' },
        { kind: 'block', type: 'pbmp_function_call' },
      ],
    },
  ],
};
