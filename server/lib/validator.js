import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const schemaPath = join(__dirname, '../../schemas/requirement.schema.json');
const schema = JSON.parse(readFileSync(schemaPath, 'utf8'));

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
const validateSchema = ajv.compile(schema);

const APPROVED_VOCABULARY = {
  actors: [
    'Sales Manager',
    'Business Owner',
    'Product Manager',
    'Customer',
    'System',
    'Sales Director',
  ],
  entities: ['Lead', 'Task', 'User', 'AuditLog', 'Invoice', 'Customer'],
  statuses: ['Draft', 'Validated', 'Approved for Design'],
};

export function validateRequirement(requirement) {
  const errors = [];

  const valid = validateSchema(requirement);
  if (!valid) {
    validateSchema.errors.forEach((e) => {
      errors.push(`${e.instancePath || 'root'}: ${e.message}`);
    });
  }

  if (!requirement.condition && (!requirement.conditions || requirement.conditions.length === 0)) {
    errors.push('At least one condition is required (add a Condition block).');
  }

  if (requirement.actor && !APPROVED_VOCABULARY.actors.includes(requirement.actor)) {
    errors.push(
      `Actor "${requirement.actor}" is not in approved vocabulary. Allowed: ${APPROVED_VOCABULARY.actors.join(', ')}`,
    );
  }

  requirement.data_entities?.forEach((entity) => {
    if (!APPROVED_VOCABULARY.entities.includes(entity)) {
      errors.push(
        `Data entity "${entity}" is not in approved vocabulary. Allowed: ${APPROVED_VOCABULARY.entities.join(', ')}`,
      );
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    vocabulary: APPROVED_VOCABULARY,
  };
}

export function requirementToExpectedOutputContract(requirement) {
  return {
    expected_output_contract_id: `EOC-${requirement.requirement_id.replace('REQ-', '')}`,
    source_stage: 'Product Discovery',
    business_goal_id: `GOAL-${requirement.requirement_id.replace('REQ-', '')}`,
    requirement_ids: [requirement.requirement_id],
    expected_business_outcome: requirement.goal,
    in_scope: requirement.actions,
    out_of_scope: [],
    actors: requirement.actor ? [requirement.actor] : [],
    data_entities: requirement.data_entities || [],
    business_rules: requirement.business_rules || [],
    acceptance_criteria: requirement.acceptance_criteria.map((ac, i) => `AC-${requirement.requirement_id}-${i + 1}: ${ac}`),
    nfrs: requirement.nfrs || {},
    approved_by: requirement.approvals?.[0] || 'Pending',
    status: 'Approved for Design',
  };
}
