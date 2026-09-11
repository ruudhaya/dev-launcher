/**
 * The JSON Schema for package.json's "launcher" field and .devlaunch.local.json.
 * Kept here, next to the validator it documents, and written to schemas/ by
 * scripts/generate-config-schema.mjs so editors and docs can reference it.
 *
 * "processes" and "env" are intentionally absent — with additionalProperties
 * false they fail validation like any other unknown field, matching what
 * validate.ts does at runtime (with a clearer error message).
 */

const SINGLE_LAUNCHER_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    name: {
      type: 'string',
      minLength: 1,
      description: 'Display name shown in Spotlight. Defaults to the project name.',
    },
    script: {
      type: 'string',
      minLength: 1,
      description: 'The package.json script to run, e.g. "dev".',
    },
    port: {
      type: 'integer',
      minimum: 1,
      maximum: 65535,
      description: 'The port the dev server listens on.',
    },
    mode: {
      type: 'string',
      enum: ['terminal', 'headless'],
      default: 'terminal',
      description:
        'Whether the launcher opens a visible Terminal window or runs in the background.',
    },
    icon: {
      type: 'string',
      minLength: 1,
      description: 'Path to an icon image, relative to the project root.',
    },
    openPath: {
      type: 'string',
      minLength: 1,
      default: '/',
      description: 'Path to open in the browser once the server is ready.',
    },
    browser: {
      type: 'string',
      minLength: 1,
      description: 'Browser to open in. Defaults to the system default browser.',
    },
    readyTimeoutSeconds: {
      type: 'integer',
      minimum: 1,
      default: 90,
      description: 'How long to wait for the server to become ready before giving up.',
    },
  },
} as const;

export const CONFIG_SCHEMA = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://devlaunch.dev/schemas/config.schema.json',
  title: 'devlaunch launcher config',
  description:
    'The "launcher" field in package.json, or the contents of .devlaunch.local.json. Either a ' +
    'single launcher config, or an array of them for a monorepo (one entry per app). ' +
    '"processes" and "env" are reserved for a future release and are rejected today.',
  oneOf: [SINGLE_LAUNCHER_SCHEMA, { type: 'array', minItems: 1, items: SINGLE_LAUNCHER_SCHEMA }],
} as const;

/** Pure serialization — writing it to schemas/ is scripts/generate-config-schema.mjs's job. */
export function generateConfigSchemaJson(): string {
  return `${JSON.stringify(CONFIG_SCHEMA, null, 2)}\n`;
}
