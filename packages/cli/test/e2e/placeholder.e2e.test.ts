import { describe, expect, it } from 'vitest';

/**
 * Placeholder e2e suite. It exists so the macOS e2e CI job is wired up and green.
 * Real end-to-end tests will drive the built CLI against the fixtures in
 * `examples/` (generate a launcher, assert the .app bundle, then undo).
 */
describe('devlaunch e2e (placeholder)', () => {
  it('runs on the e2e runner', () => {
    expect(true).toBe(true);
  });
});
