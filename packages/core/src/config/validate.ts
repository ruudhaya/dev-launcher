import { DevlaunchError } from '../errors/index.js';
import type { LauncherConfigFields, LauncherMode } from './types.js';

const ALLOWED_FIELDS = [
  'name',
  'script',
  'port',
  'mode',
  'icon',
  'openPath',
  'browser',
  'readyTimeoutSeconds',
] as const;

/**
 * Reserved for later features (see LATER.md). Present in the type system only
 * so we can reject them with a clear message instead of silently ignoring
 * them or letting them through as unknown fields.
 */
const RESERVED_FIELD_MESSAGES: Readonly<Record<string, string>> = {
  processes:
    '"processes" is not supported yet — multi-process launchers (e.g. frontend + API in one ' +
    'app) are planned but not implemented. Remove it from your launcher config.',
  env:
    '"env" is not supported yet — projects keep using their own .env files for now. Remove it ' +
    'from your launcher config; see LATER.md for the planned Keychain secrets feature.',
};

function fail(layerLabel: string, message: string): never {
  throw new DevlaunchError('CONFIG_INVALID', `${layerLabel}: ${message}`);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function expectNonEmptyString(value: unknown, layerLabel: string, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    fail(layerLabel, `"${field}" must be a non-empty string.`);
  }
  return value;
}

function expectPort(value: unknown, layerLabel: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > 65535) {
    fail(layerLabel, '"port" must be an integer between 1 and 65535.');
  }
  return value;
}

function expectMode(value: unknown, layerLabel: string): LauncherMode {
  if (value !== 'terminal' && value !== 'headless') {
    fail(layerLabel, '"mode" must be "terminal" or "headless".');
  }
  return value;
}

function expectPositiveInteger(value: unknown, layerLabel: string, field: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    fail(layerLabel, `"${field}" must be a positive integer.`);
  }
  return value;
}

/** Validate one layer's raw value as a single config object (never an array). */
export function validateLauncherConfigFields(
  value: unknown,
  layerLabel: string,
): LauncherConfigFields {
  if (value === undefined) {
    return {};
  }
  if (!isPlainObject(value)) {
    fail(layerLabel, 'must be an object.');
  }

  for (const [key, message] of Object.entries(RESERVED_FIELD_MESSAGES)) {
    if (key in value) {
      fail(layerLabel, message);
    }
  }

  const unknownKeys = Object.keys(value).filter(
    (key) => !(ALLOWED_FIELDS as readonly string[]).includes(key),
  );
  if (unknownKeys.length > 0) {
    const plural = unknownKeys.length > 1 ? 's' : '';
    fail(layerLabel, `unknown field${plural} ${unknownKeys.map((k) => `"${k}"`).join(', ')}.`);
  }

  const fields: Record<string, unknown> = {};
  if ('name' in value) fields.name = expectNonEmptyString(value.name, layerLabel, 'name');
  if ('script' in value) fields.script = expectNonEmptyString(value.script, layerLabel, 'script');
  if ('port' in value) fields.port = expectPort(value.port, layerLabel);
  if ('mode' in value) fields.mode = expectMode(value.mode, layerLabel);
  if ('icon' in value) fields.icon = expectNonEmptyString(value.icon, layerLabel, 'icon');
  if ('openPath' in value) {
    fields.openPath = expectNonEmptyString(value.openPath, layerLabel, 'openPath');
  }
  if ('browser' in value)
    fields.browser = expectNonEmptyString(value.browser, layerLabel, 'browser');
  if ('readyTimeoutSeconds' in value) {
    fields.readyTimeoutSeconds = expectPositiveInteger(
      value.readyTimeoutSeconds,
      layerLabel,
      'readyTimeoutSeconds',
    );
  }

  return fields as LauncherConfigFields;
}

/** Validate a raw layer that may be an array — only package.json's "launcher" is allowed to be. */
export function validateRawLauncherConfig(
  value: unknown,
  layerLabel: string,
  options: { readonly allowArray: boolean },
): LauncherConfigFields | LauncherConfigFields[] {
  if (Array.isArray(value)) {
    if (!options.allowArray) {
      fail(
        layerLabel,
        'must be a single object here — only package.json "launcher" may be an array (for monorepos).',
      );
    }
    if (value.length === 0) {
      fail(layerLabel, 'must not be an empty array.');
    }
    return value.map((entry, index) =>
      validateLauncherConfigFields(entry, `${layerLabel}[${index}]`),
    );
  }
  return validateLauncherConfigFields(value, layerLabel);
}
