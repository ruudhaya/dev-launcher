import { join } from 'node:path';
import type { ResolvedLauncherConfig } from '../config/index.js';
import type { PackageManager } from '../detect/index.js';
import { DevlaunchError } from '../errors/index.js';
import type { BundleFile } from '../platform/index.js';
import { generateLauncherEnv } from './launcher-env.js';
import type { BundleRegistry } from './registry.js';
import { slugify } from './slug.js';
import { setLsUiElementHeadless, substitutePlaceholders } from './template.js';

export interface BundlePlanInputs {
  readonly config: ResolvedLauncherConfig;
  readonly projectDir: string;
  readonly packageManager: PackageManager;
  readonly devlaunchVersion: string;
  /** Info.plist template text (with __TOKEN__ placeholders), from @devlaunch/runtime. */
  readonly infoPlistTemplate: string;
  /** MacOS/launcher script template text, from @devlaunch/runtime. */
  readonly launcherScriptTemplate: string;
  /** The vendored CLI's built JS, embedded so the launcher can build reports offline. */
  readonly vendoredCli: string;
  /** Resources/icon.icns bytes — see src/icon for how these are produced. */
  readonly icon: Uint8Array;
}

export interface PlanBundleOptions {
  readonly bundleLocation: string;
  readonly registry: BundleRegistry;
}

export interface BundlePlan {
  readonly name: string;
  readonly slug: string;
  readonly bundleId: string;
  /** Absolute path to the .app bundle root. */
  readonly bundlePath: string;
  /** True if this replaces an existing launcher for the same project in place. */
  readonly replacingInPlace: boolean;
  readonly files: readonly BundleFile[];
}

/**
 * Decide the launcher's final name: the requested name if it's free (or
 * already belongs to this same project — "replace in place"), otherwise a
 * NAME_COLLISION error naming the first free "<name>-<n>" suggestion.
 */
function resolveBundleName(
  requestedName: string,
  projectDir: string,
  registry: BundleRegistry,
): { readonly name: string; readonly replacingInPlace: boolean } {
  const existing = registry[requestedName];
  if (!existing || existing.projectDir === projectDir) {
    return { name: requestedName, replacingInPlace: existing !== undefined };
  }

  let suffix = 2;
  let suggested = `${requestedName}-${suffix}`;
  while (registry[suggested] && registry[suggested]?.projectDir !== projectDir) {
    suffix += 1;
    suggested = `${requestedName}-${suffix}`;
  }

  throw new DevlaunchError(
    'NAME_COLLISION',
    `"${requestedName}" is already used by a launcher for ${existing.projectDir}. ` +
      `Suggested name: "${suggested}".`,
  );
}

/**
 * The pure half of bundle generation: given detection/config and the raw
 * template text, decide the launcher's name and produce every file to write
 * — no I/O here. writeBundle (see write.ts) does the actual filesystem work
 * with the result.
 */
export function planBundle(inputs: BundlePlanInputs, options: PlanBundleOptions): BundlePlan {
  const { name, replacingInPlace } = resolveBundleName(
    inputs.config.name,
    inputs.projectDir,
    options.registry,
  );
  const slug = slugify(name);
  const bundleId = `dev.devlaunch.${slug}`;
  const bundlePath = join(options.bundleLocation, `${name}.app`);

  const infoPlist = setLsUiElementHeadless(
    substitutePlaceholders(inputs.infoPlistTemplate, {
      PROJECT_NAME: name,
      PROJECT_SLUG: slug,
      DEVLAUNCH_VERSION: inputs.devlaunchVersion,
    }),
    inputs.config.mode === 'headless',
  );

  const launcherScript = substitutePlaceholders(inputs.launcherScriptTemplate, {});

  const launcherEnv = generateLauncherEnv({
    projectDir: inputs.projectDir,
    name,
    script: inputs.config.script,
    port: inputs.config.port,
    mode: inputs.config.mode,
    openPath: inputs.config.openPath,
    browser: inputs.config.browser,
    readyTimeoutSeconds: inputs.config.readyTimeoutSeconds,
    packageManager: inputs.packageManager,
    devlaunchVersion: inputs.devlaunchVersion,
  });

  const files: BundleFile[] = [
    { relativePath: 'Contents/Info.plist', content: infoPlist },
    { relativePath: 'Contents/MacOS/launcher', content: launcherScript, executable: true },
    { relativePath: 'Contents/Resources/launcher.env', content: launcherEnv },
    { relativePath: 'Contents/Resources/devlaunch.mjs', content: inputs.vendoredCli },
    { relativePath: 'Contents/Resources/icon.icns', content: inputs.icon },
  ];

  return { name, slug, bundleId, bundlePath, replacingInPlace, files };
}
