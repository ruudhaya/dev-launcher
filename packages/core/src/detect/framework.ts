import type { FrameworkInfo } from './types.js';

interface FrameworkDefinition extends FrameworkInfo {
  readonly matches: (deps: Record<string, string>) => boolean;
}

const LOCAL_URL_READY_PATTERN = /Local:?\s+https?:\/\/[^\s]+:(\d+)/i;

/**
 * Order matters: several frameworks depend on vite/webpack internally, so the
 * more specific framework must be checked first or it would be mis-detected
 * as its underlying build tool.
 */
const FRAMEWORKS: readonly FrameworkDefinition[] = [
  {
    name: 'next',
    defaultPort: 3000,
    readyPattern: LOCAL_URL_READY_PATTERN,
    matches: (deps) => 'next' in deps,
  },
  {
    name: 'remix',
    defaultPort: 3000,
    readyPattern: /(?:App Server started at|Local:?)\s+https?:\/\/[^\s]+:(\d+)/i,
    matches: (deps) => Object.keys(deps).some((name) => name.startsWith('@remix-run/')),
  },
  {
    name: 'nuxt',
    defaultPort: 3000,
    readyPattern: LOCAL_URL_READY_PATTERN,
    matches: (deps) => 'nuxt' in deps || 'nuxt3' in deps,
  },
  {
    name: 'astro',
    defaultPort: 4321,
    readyPattern: /Local\s+https?:\/\/[^\s]+:(\d+)/i,
    matches: (deps) => 'astro' in deps,
  },
  {
    name: 'sveltekit',
    defaultPort: 5173,
    readyPattern: LOCAL_URL_READY_PATTERN,
    matches: (deps) => '@sveltejs/kit' in deps,
  },
  {
    name: 'react-scripts',
    defaultPort: 3000,
    readyPattern: LOCAL_URL_READY_PATTERN,
    matches: (deps) => 'react-scripts' in deps,
  },
  {
    // Checked last: vite itself is a dependency of several frameworks above.
    name: 'vite',
    defaultPort: 5173,
    readyPattern: LOCAL_URL_READY_PATTERN,
    matches: (deps) => 'vite' in deps,
  },
];

/** A generic fallback for projects devlaunch doesn't recognize a framework for. */
export const GENERIC_READY_PATTERN = /https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0):(\d+)/i;

/** Identify a known framework from a project's merged dependencies. */
export function detectFramework(deps: Record<string, string>): FrameworkInfo | undefined {
  const found = FRAMEWORKS.find((framework) => framework.matches(deps));
  if (!found) {
    return undefined;
  }
  return { name: found.name, defaultPort: found.defaultPort, readyPattern: found.readyPattern };
}

/** The ready-line pattern to poll stdout/stderr with — the framework's, or the generic fallback. */
export function resolveReadyPattern(framework: FrameworkInfo | undefined): RegExp {
  return framework?.readyPattern ?? GENERIC_READY_PATTERN;
}
