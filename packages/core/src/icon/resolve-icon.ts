import { join } from 'node:path';
import type { IconCandidate } from '../detect/index.js';
import type { PlatformAdapter } from '../platform/index.js';

export interface ResolveIconInputs {
  /** Icon candidates from detection, in priority order — the first is tried. */
  readonly candidates: readonly IconCandidate[];
  readonly projectDir: string;
  /** icns bytes to fall back to when there's no candidate or conversion fails. */
  readonly defaultIcon: Uint8Array;
}

/**
 * PNG to icns via the platform adapter (sips + iconutil); the given default
 * icon otherwise — no candidate, an unreadable PNG, or a platform (or a test
 * double) that can't do the conversion at all. This never throws: a bad icon
 * is never a reason to fail generating a launcher.
 */
export async function resolveIcon(
  inputs: ResolveIconInputs,
  adapter: PlatformAdapter,
): Promise<Uint8Array> {
  const candidate = inputs.candidates[0];
  if (!candidate) {
    return inputs.defaultIcon;
  }

  try {
    return await adapter.convertPngToIcns(join(inputs.projectDir, candidate.path));
  } catch {
    return inputs.defaultIcon;
  }
}
