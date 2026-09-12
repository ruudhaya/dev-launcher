import type { ResolvedLauncherConfig } from '@devlaunch/core';

/**
 * A locally-typed stand-in for Array.isArray: the ambient signature (`arg is
 * any[]`) doesn't reliably narrow away a readonly-array union member in the
 * negative branch, since `readonly T[]` isn't assignable to (mutable) `any[]`.
 * Used anywhere resolveConfig's array-or-single result needs narrowing.
 */
export function isConfigArray(
  value: ResolvedLauncherConfig | readonly ResolvedLauncherConfig[],
): value is readonly ResolvedLauncherConfig[] {
  return Array.isArray(value);
}
