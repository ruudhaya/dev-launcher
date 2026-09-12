import { describe, expect, it } from 'vitest';
import { CORE_VERSION } from '../src/index.js';
import type { ReportEnvironment, ReportInput } from '../src/report/index.js';
import { buildReport, MAX_REPORT_CHARACTERS, REPORT_LOG_LINE_LIMIT } from '../src/report/index.js';

const baseEnvironment: ReportEnvironment = {
  macOSVersion: '14.5',
  arch: 'arm64',
  nodeVersion: '20.11.0',
  nodeVersionSource: 'nvmrc',
  packageManager: 'npm',
  devlaunchVersion: CORE_VERSION,
};

function baseInput(overrides: Partial<ReportInput> = {}): ReportInput {
  return {
    summary: 'The dev server did not become ready in time.',
    errorCode: 'READY_TIMEOUT',
    stepsAttempted: ['checked Node version', 'installed dependencies', 'started the dev server'],
    environment: baseEnvironment,
    config: { name: 'my-app', script: 'dev', port: 5173, mode: 'terminal' },
    logLines: ['Local: http://localhost:5173/'],
    ...overrides,
  };
}

describe('buildReport — shape', () => {
  it('starts with the marker line', () => {
    expect(buildReport(baseInput()).startsWith('devlaunch report v1')).toBe(true);
  });

  it('ends by telling an agent to run doctor --json', () => {
    const report = buildReport(baseInput());
    expect(report.trimEnd().endsWith('for a full environment check.')).toBe(true);
    expect(report).toContain('Run `npx devlaunch doctor --json` for a full environment check.');
  });

  it('includes the error code, title, and agentHint', () => {
    const report = buildReport(baseInput({ errorCode: 'PORT_IN_USE' }));
    expect(report).toContain('Error: PORT_IN_USE');
    expect(report).toContain('For coding agents:');
  });

  it('numbers the steps attempted', () => {
    const report = buildReport(baseInput());
    expect(report).toContain('1. checked Node version');
    expect(report).toContain('3. started the dev server');
  });

  it('formats the environment and config sections', () => {
    const report = buildReport(baseInput());
    expect(report).toContain('- macOS: 14.5');
    expect(report).toContain('- Node: 20.11.0 (from nvmrc)');
    expect(report).toContain(`- devlaunch: ${CORE_VERSION}`);
    expect(report).toContain('- name: "my-app"');
    expect(report).toContain('- port: 5173');
  });

  it('omits undefined config fields instead of printing them', () => {
    const report = buildReport(baseInput({ config: { name: 'x', icon: undefined } }));
    expect(report).not.toContain('icon');
  });

  it('says "not found" for a missing Node version', () => {
    const report = buildReport(
      baseInput({
        environment: { ...baseEnvironment, nodeVersion: undefined, nodeVersionSource: undefined },
      }),
    );
    expect(report).toContain('- Node: not found');
  });

  it('omits the Error section entirely when no errorCode is given', () => {
    const { errorCode: _errorCode, ...rest } = baseInput();
    const report = buildReport({ ...rest, summary: 'Status snapshot for "my-app".' });
    expect(report).not.toContain('Error:');
    expect(report).not.toContain('For coding agents:');
    expect(report).toContain('Status snapshot for "my-app".');
  });
});

describe('buildReport — redaction', () => {
  it('redacts a known secret value everywhere it appears', () => {
    const report = buildReport(
      baseInput({
        summary: 'Server crashed while using OPENAI_API_KEY=sk-thisisarealsecretvalue123',
        logLines: ['loaded key sk-thisisarealsecretvalue123 from env'],
        secretValues: ['sk-thisisarealsecretvalue123'],
      }),
    );
    expect(report).not.toContain('sk-thisisarealsecretvalue123');
    expect(report).toContain('[REDACTED]');
  });

  it('redacts pattern-matched secrets even with no known values supplied', () => {
    const report = buildReport(baseInput({ logLines: ['Authorization: Bearer abc123.def456'] }));
    expect(report).not.toContain('abc123.def456');
    expect(report).toContain('Bearer [REDACTED]');
  });
});

describe('buildReport — log handling', () => {
  it('keeps only the most recent REPORT_LOG_LINE_LIMIT lines', () => {
    const logLines = Array.from({ length: 200 }, (_, i) => `line ${i}`);
    const report = buildReport(baseInput({ logLines }));
    expect(report).toContain('line 199');
    expect(report).not.toContain('line 0\n');
    expect(report).toContain(`last ${REPORT_LOG_LINE_LIMIT} lines`);
  });

  it('stays at or under the ~12k character cap even with huge logs', () => {
    const logLines = Array.from({ length: 5000 }, (_, i) =>
      `a very long log line number ${i} `.repeat(5),
    );
    const report = buildReport(baseInput({ logLines }));
    expect(report.length).toBeLessThanOrEqual(MAX_REPORT_CHARACTERS + 1);
    expect(report).toContain('earlier lines omitted');
    // Most recent lines are still the ones kept.
    expect(report).toContain('a very long log line number 4999');
  });

  it('does not add a truncation notice when logs already fit', () => {
    const report = buildReport(baseInput({ logLines: ['short line'] }));
    expect(report).not.toContain('earlier lines omitted');
  });
});

describe('buildReport — snapshots per broken fixture', () => {
  const fixtureEnvironment: ReportEnvironment = {
    macOSVersion: '14.5',
    arch: 'arm64',
    nodeVersion: '20.11.0',
    nodeVersionSource: 'nvmrc',
    packageManager: 'npm',
    devlaunchVersion: CORE_VERSION,
  };

  it('examples/broken/missing-dependency (DEPS_INSTALL_FAILED)', () => {
    const report = buildReport({
      summary: 'npm install failed before the dev server could start.',
      errorCode: 'DEPS_INSTALL_FAILED',
      stepsAttempted: ['resolved Node version', 'ran npm install'],
      environment: fixtureEnvironment,
      config: { name: 'broken-missing-dependency', script: 'dev', mode: 'terminal' },
      logLines: [
        '> broken-missing-dependency@0.0.0 preinstall',
        '> node -e "console.error(\'simulated failure...\'); process.exit(1)"',
        'simulated failure: broken-missing-dependency always fails to install',
        'npm error code 1',
        'npm error command failed',
      ],
    });
    expect(report).toMatchSnapshot();
  });

  it('examples/broken/crash-on-start (SERVER_EXITED_EARLY)', () => {
    const report = buildReport({
      summary: 'The dev server process exited immediately after starting.',
      errorCode: 'SERVER_EXITED_EARLY',
      stepsAttempted: ['resolved Node version', 'installed dependencies', 'started npm run dev'],
      environment: fixtureEnvironment,
      config: { name: 'broken-crash-on-start', script: 'dev', mode: 'terminal' },
      logLines: ['simulated crash: broken-crash-on-start always exits immediately'],
    });
    expect(report).toMatchSnapshot();
  });

  it('examples/broken/wrong-port-config (READY_TIMEOUT)', () => {
    const report = buildReport({
      summary: 'The dev server never became ready on the configured port.',
      errorCode: 'READY_TIMEOUT',
      stepsAttempted: [
        'resolved Node version',
        'installed dependencies',
        'started npm run dev',
        'polled port 9999 for 90 seconds',
      ],
      environment: fixtureEnvironment,
      config: { name: 'broken-wrong-port-config', script: 'dev', port: 9999, mode: 'terminal' },
      logLines: ['Local: http://localhost:4321'],
    });
    expect(report).toMatchSnapshot();
  });

  it('examples/broken/node-version-mismatch (NODE_VERSION_MISSING)', () => {
    const report = buildReport({
      summary: 'This project requires a Node.js version that is not installed.',
      errorCode: 'NODE_VERSION_MISSING',
      stepsAttempted: ['read .nvmrc (99.99.99)', 'checked installed Node versions'],
      environment: { ...fixtureEnvironment, nodeVersion: undefined, nodeVersionSource: undefined },
      config: { name: 'broken-node-version-mismatch', script: 'dev', mode: 'terminal' },
      logLines: [],
    });
    expect(report).toMatchSnapshot();
  });
});
