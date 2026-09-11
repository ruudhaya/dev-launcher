import { DevlaunchError } from '../errors/index.js';
import { DEFAULT_MODE, DEFAULT_OPEN_PATH, DEFAULT_READY_TIMEOUT_SECONDS } from './defaults.js';
import type { LauncherConfigFields, ResolvedLauncherConfig } from './types.js';
import { validateRawLauncherConfig } from './validate.js';

export interface ResolveConfigOptions {
  /** Detected/derived values — the lowest-precedence layer (see buildDefaultsFromDetection). */
  readonly defaults: LauncherConfigFields;
  /** package.json's "launcher" field, raw. May be an array for monorepos. */
  readonly packageJsonLauncher?: unknown;
  /** .devlaunch.local.json's parsed contents, raw. */
  readonly localConfig?: unknown;
  /** CLI flags, raw — highest precedence. */
  readonly flags?: unknown;
}

function mergeFields(...layers: readonly LauncherConfigFields[]): LauncherConfigFields {
  const merged: Record<string, unknown> = {};
  for (const layer of layers) {
    for (const [key, value] of Object.entries(layer)) {
      if (value !== undefined) {
        merged[key] = value;
      }
    }
  }
  return merged as LauncherConfigFields;
}

function finalize(fields: LauncherConfigFields, layerLabel: string): ResolvedLauncherConfig {
  if (!fields.name) {
    throw new DevlaunchError(
      'CONFIG_INVALID',
      `${layerLabel}: could not determine a launcher name.`,
    );
  }
  return {
    name: fields.name,
    script: fields.script,
    port: fields.port,
    mode: fields.mode ?? DEFAULT_MODE,
    icon: fields.icon,
    openPath: fields.openPath ?? DEFAULT_OPEN_PATH,
    browser: fields.browser,
    readyTimeoutSeconds: fields.readyTimeoutSeconds ?? DEFAULT_READY_TIMEOUT_SECONDS,
  };
}

/**
 * Merge the four config layers in precedence order: defaults < package.json
 * "launcher" < .devlaunch.local.json < flags.
 *
 * Returns an array when package.json's "launcher" is an array — one config
 * per monorepo app. .devlaunch.local.json and CLI flags aren't array-shaped;
 * whatever they set applies uniformly on top of every app's entry (picking
 * *which* app to actually launch is a CLI concern, not this merge).
 */
export function resolveConfig(
  options: ResolveConfigOptions,
): ResolvedLauncherConfig | readonly ResolvedLauncherConfig[] {
  const packageJsonLayer = validateRawLauncherConfig(
    options.packageJsonLauncher,
    'package.json "launcher"',
    { allowArray: true },
  );
  const localLayer = validateRawLauncherConfig(options.localConfig, '.devlaunch.local.json', {
    allowArray: false,
  }) as LauncherConfigFields;
  const flagsLayer = validateRawLauncherConfig(options.flags, 'CLI flags', {
    allowArray: false,
  }) as LauncherConfigFields;

  if (Array.isArray(packageJsonLayer)) {
    return packageJsonLayer.map((entry, index) =>
      finalize(
        mergeFields(options.defaults, entry, localLayer, flagsLayer),
        `package.json "launcher"[${index}]`,
      ),
    );
  }

  return finalize(
    mergeFields(options.defaults, packageJsonLayer, localLayer, flagsLayer),
    'launcher config',
  );
}
