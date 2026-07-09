import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const schema = JSON.parse(
  readFileSync(join(root, 'schemas/requirement.schema.json'), 'utf8'),
);
const sample = JSON.parse(
  readFileSync(join(root, 'pbmp-implementation-pack/requirements/approved-requirements.json'), 'utf8'),
)[0];

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
const validate = ajv.compile(schema);

if (!validate(sample)) {
  console.error('Sample requirement failed schema validation:');
  console.error(validate.errors);
  process.exit(1);
}

console.log('OK: Sample requirement passes PBMP JSON schema');
