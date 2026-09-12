import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';

const schemaPath = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../schemas/envelope.schema.json',
);
const schema = JSON.parse(readFileSync(schemaPath, 'utf8'));
const ajv = new Ajv2020();
const validate = ajv.compile(schema);

/** Asserts an envelope matches schemas/envelope.schema.json — see docs/agent-contract.md. */
export function expectValidEnvelope(envelope: unknown): void {
  if (!validate(envelope)) {
    throw new Error(
      `Envelope failed schema validation:\n${JSON.stringify(validate.errors, null, 2)}\n` +
        `Envelope: ${JSON.stringify(envelope, null, 2)}`,
    );
  }
}
