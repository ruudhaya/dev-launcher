import { describe, expect, it } from 'vitest';
import { CORE_VERSION, DevlaunchError, detectProject } from '../src/index.js';

describe('@devlaunch/core scaffold', () => {
  it('exposes a version string', () => {
    expect(typeof CORE_VERSION).toBe('string');
  });

  it('detectProject throws a typed NOT_IMPLEMENTED error for now', () => {
    try {
      detectProject('/tmp/whatever');
      expect.unreachable('detectProject should throw until product logic lands');
    } catch (err) {
      expect(err).toBeInstanceOf(DevlaunchError);
      expect((err as DevlaunchError).code).toBe('NOT_IMPLEMENTED');
    }
  });
});
