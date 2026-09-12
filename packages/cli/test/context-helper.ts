import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { CliContext } from '../src/context.js';
import type { TestAdapterHandle } from './test-adapter.js';
import { createTestAdapter } from './test-adapter.js';

export interface TestContextHandle {
  readonly ctx: CliContext;
  readonly adapterHandle: TestAdapterHandle;
  readonly clipboard: string[];
}

/** A full CliContext rooted at a fresh temp directory — see test-adapter.ts. */
export async function buildTestContext(
  overrides: Partial<CliContext> = {},
): Promise<TestContextHandle> {
  const root = await mkdtemp(join(tmpdir(), 'devlaunch-cli-'));
  const adapterHandle = createTestAdapter(root);
  const clipboard: string[] = [];

  const ctx: CliContext = {
    cwd: root,
    json: false,
    yes: false,
    dryRun: false,
    noColor: true,
    interactive: false,
    adapter: adapterHandle.adapter,
    devlaunchVersion: '0.0.0',
    copyToClipboard: async (text: string) => {
      clipboard.push(text);
    },
    ...overrides,
  };

  return { ctx, adapterHandle, clipboard };
}
