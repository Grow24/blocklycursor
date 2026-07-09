import { Router } from 'express';
import { validateRequirement, requirementToExpectedOutputContract } from '../lib/validator.js';
import { saveRequirement, listRequirements, getRequirement, exportImplementationPack } from '../lib/storage.js';

const router = Router();

router.post('/validate', (req, res) => {
  const result = validateRequirement(req.body);
  if (!result.valid) {
    return res.status(400).json({
      valid: false,
      message: 'Validation failed',
      errors: result.errors,
    });
  }
  return res.json({
    valid: true,
    message: 'Requirement passes PBMP validation gates',
    expected_output_contract: requirementToExpectedOutputContract(req.body),
  });
});

router.post('/', (req, res) => {
  const result = validateRequirement(req.body);
  if (!result.valid) {
    return res.status(400).json({
      valid: false,
      message: 'Cannot save — validation failed',
      errors: result.errors,
    });
  }
  const saved = saveRequirement(req.body);
  const eoc = requirementToExpectedOutputContract(saved);
  const pack = exportImplementationPack(saved, eoc);
  return res.json({
    requirement_id: saved.requirement_id,
    status: saved.status,
    expected_output_contract_id: eoc.expected_output_contract_id,
    implementation_pack: pack,
  });
});

router.get('/', (_req, res) => {
  res.json(listRequirements());
});

router.get('/sample', (_req, res) => {
  res.json({
    requirement_id: 'REQ-SALES-001',
    goal: 'Improve high-score lead follow-up',
    actor: 'Sales Manager',
    trigger: 'Lead score updated',
    condition: { field: 'lead_score', operator: '>', value: '80' },
    conditions: [{ field: 'lead_score', operator: '>', value: '80' }],
    actions: ['Create follow-up task', 'Notify Sales Manager'],
    data_entities: ['Lead', 'Task', 'User'],
    business_rules: ['High-score leads require manager follow-up'],
    acceptance_criteria: [
      'Given a lead score becomes 81, when the rule runs, then a follow-up task is created',
      'Given the Sales Manager exists, when the rule runs, then the Sales Manager receives a notification',
    ],
    nfrs: {
      auditability: 'Every automated task creation must be logged',
      performance: 'Rule execution must complete within 3 seconds',
    },
    approvals: ['Business Owner'],
    outputs: ['Traceability to REQ-SALES-001'],
    status: 'Draft',
    blockly_workspace: {
      blocks: {
        languageVersion: 0,
        blocks: [
          {
            type: 'pbmp_requirement_root',
            id: 'root1',
            x: 50,
            y: 50,
            fields: { REQ_ID: 'REQ-SALES-001' },
            inputs: {
              BODY: {
                block: {
                  type: 'pbmp_goal',
                  id: 'g1',
                  fields: { GOAL_TEXT: 'Improve high-score lead follow-up' },
                  next: {
                    block: {
                      type: 'pbmp_actor',
                      id: 'a1',
                      fields: { ACTOR: 'Sales Manager' },
                      next: {
                        block: {
                          type: 'pbmp_trigger',
                          id: 't1',
                          fields: { TRIGGER: 'Lead score updated' },
                          next: {
                            block: {
                              type: 'pbmp_condition',
                              id: 'c1',
                              fields: { FIELD: 'lead_score', OPERATOR: '>', VALUE: '80' },
                              next: {
                                block: {
                                  type: 'pbmp_create_task',
                                  id: 'act1',
                                  fields: {
                                    TITLE: 'Follow up with customer',
                                    ASSIGNED_ROLE: 'Sales Manager',
                                  },
                                  next: {
                                    block: {
                                      type: 'pbmp_notify',
                                      id: 'act2',
                                      fields: {
                                        ROLE: 'Sales Manager',
                                        MESSAGE: 'High-score lead needs follow-up',
                                      },
                                      next: {
                                        block: {
                                          type: 'pbmp_acceptance',
                                          id: 'ac1',
                                          fields: {
                                            AC: 'Given score > 80, then task is created',
                                          },
                                        },
                                      },
                                    },
                                  },
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        ],
      },
    },
  });
});

router.get('/:id', (req, res) => {
  const item = getRequirement(req.params.id);
  if (!item) return res.status(404).json({ message: 'Not found' });
  return res.json(item);
});

export default router;
