import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
// @ts-expect-error — plain JS test/build helper, not part of the TS build.
import { makeSolidPng } from '../scripts/make-solid-png.mjs';
import type { IconCandidate } from '../src/detect/index.js';
import { ICONSET_ENTRIES, resolveIcon } from '../src/icon/index.js';
import type { PlatformAdapter } from '../src/platform/index.js';
import { createMacosPlatformAdapter } from '../src/platform/index.js';

const here = dirname(fileURLToPath(import.meta.url));
const defaultIconPath = resolve(here, '../../runtime/assets/default-icon.icns');

const tempDirs: string[] = [];
function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'devlaunch-icon-test-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
});

const DEFAULT_ICON = new Uint8Array([1, 2, 3, 4]); // stand-in bytes for fake-adapter tests

function fakeAdapter(convert: PlatformAdapter['convertPngToIcns']): PlatformAdapter {
  const notImplemented = () => {
    throw new Error('not implemented in fake adapter');
  };
  return {
    platform: 'macos',
    bundleLocation: notImplemented,
    supportDirectory: notImplemented,
    logsDirectory: notImplemented,
    runDirectory: notImplemented,
    writeBundle: notImplemented,
    registerWithSpotlight: notImplemented,
    isIndexedBySpotlight: notImplemented,
    readTextFile: notImplemented,
    writeTextFile: notImplemented,
    convertPngToIcns: convert,
    showDialog: notImplemented,
    showNotification: notImplemented,
    openUrl: notImplemented,
    revealInFinder: notImplemented,
  };
}

describe('resolveIcon', () => {
  const candidate: IconCandidate = { path: 'public/logo.png', source: 'public/logo.png' };

  it('returns the default icon when there are no candidates', async () => {
    const adapter = fakeAdapter(async () => {
      throw new Error('should not be called');
    });
    const icon = await resolveIcon(
      { candidates: [], projectDir: '/x', defaultIcon: DEFAULT_ICON },
      adapter,
    );
    expect(icon).toBe(DEFAULT_ICON);
  });

  it('converts the first candidate via the adapter, at its absolute path', async () => {
    const converted = new Uint8Array([9, 9, 9]);
    let calledWith: string | undefined;
    const adapter = fakeAdapter(async (pngPath) => {
      calledWith = pngPath;
      return converted;
    });

    const icon = await resolveIcon(
      { candidates: [candidate], projectDir: '/Users/me/my-app', defaultIcon: DEFAULT_ICON },
      adapter,
    );

    expect(icon).toBe(converted);
    expect(calledWith).toBe('/Users/me/my-app/public/logo.png');
  });

  it('falls back to the default icon when conversion fails', async () => {
    const adapter = fakeAdapter(async () => {
      throw new Error('sips is not installed');
    });
    const icon = await resolveIcon(
      { candidates: [candidate], projectDir: '/x', defaultIcon: DEFAULT_ICON },
      adapter,
    );
    expect(icon).toBe(DEFAULT_ICON);
  });
});

describe('createMacosPlatformAdapter — convertPngToIcns (real sips/iconutil)', () => {
  it('converts a real PNG into a valid .icns', async () => {
    const dir = tempDir();
    const pngPath = join(dir, 'source.png');
    writeFileSync(pngPath, makeSolidPng(64, [37, 99, 235]));

    const adapter = createMacosPlatformAdapter();
    const icns = await adapter.convertPngToIcns(pngPath);

    // ICNS files start with the ASCII magic "icns".
    expect(Buffer.from(icns.slice(0, 4)).toString('ascii')).toBe('icns');
    expect(icns.length).toBeGreaterThan(100);
  });

  it('produces one output file per ICONSET_ENTRIES size (sanity on the recipe)', () => {
    expect(ICONSET_ENTRIES.length).toBeGreaterThanOrEqual(10);
    expect(new Set(ICONSET_ENTRIES.map((e) => e.fileName)).size).toBe(ICONSET_ENTRIES.length);
  });
});

describe('the checked-in default icon asset', () => {
  it('is a real, valid .icns file', () => {
    const bytes = readFileSync(defaultIconPath);
    expect(bytes.subarray(0, 4).toString('ascii')).toBe('icns');
    expect(bytes.length).toBeGreaterThan(1000);
  });
});
