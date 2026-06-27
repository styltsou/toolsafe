import { describe, expect, test } from 'bun:test';
import { runCli } from '../helpers/cli';

describe('toolsafe --config CLI flag', () => {
  test('lint --config disables rules specified in the config', async () => {
    const defaultResult = await runCli(['lint', 'examples/risky-openapi.yaml', '--format', 'json']);
    const defaultReport = JSON.parse(defaultResult.stdout);
    const errorCountBefore = defaultReport.findings.filter(
      (f: { ruleId: string }) => f.ruleId === 'safety/destructive-requires-guard',
    ).length;

    const result = await runCli([
      'lint',
      'examples/risky-openapi.yaml',
      '--format',
      'json',
      '--config',
      'tests/fixtures/toolsafe.config.json',
    ]);
    const report = JSON.parse(result.stdout);

    const errorCountAfter = report.findings.filter(
      (f: { ruleId: string }) => f.ruleId === 'safety/destructive-requires-guard',
    ).length;

    expect(errorCountBefore).toBeGreaterThan(0);
    expect(errorCountAfter).toBe(0);
  });

  test('report --config applies severity overrides', async () => {
    const defaultResult = await runCli([
      'report',
      'examples/risky-openapi.yaml',
      '--format',
      'json',
    ]);
    const defaultReport = JSON.parse(defaultResult.stdout);
    const defaultSeverities = defaultReport.findings
      .filter((f: { ruleId: string }) => f.ruleId === 'errors/missing-error-schema')
      .map((f: { severity: string }) => f.severity);

    const result = await runCli([
      'report',
      'examples/risky-openapi.yaml',
      '--format',
      'json',
      '--config',
      'tests/fixtures/toolsafe.config.json',
    ]);
    const report = JSON.parse(result.stdout);

    const overriddenSeverities = report.findings
      .filter((f: { ruleId: string }) => f.ruleId === 'errors/missing-error-schema')
      .map((f: { severity: string }) => f.severity);

    expect(defaultSeverities).toContain('warning');
    expect(overriddenSeverities).toContain('error');
  });

  test('generate --kind policy --config works with a config file', async () => {
    const result = await runCli([
      'generate',
      '--kind',
      'policy',
      'examples/risky-openapi.yaml',
      '--config',
      'tests/fixtures/toolsafe.config.json',
    ]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('deleteUser');
    expect(result.stderr).toBe('');
  });

  test('generate --kind evals --config works with a config file', async () => {
    const result = await runCli([
      'generate',
      '--kind',
      'evals',
      'examples/risky-openapi.yaml',
      '--config',
      'tests/fixtures/toolsafe.config.json',
    ]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('deleteUser');
    expect(result.stderr).toBe('');
  });

  test('lint with --config --fail-on warning exits 1 when findings exceed threshold', async () => {
    const result = await runCli([
      'lint',
      'tests/fixtures/simple-openapi.json',
      '--fail-on',
      'warning',
      '--config',
      'tests/fixtures/toolsafe.config.json',
    ]);

    expect(result.exitCode).toBe(1);
  });

  test('config lint.failOn is respected when --fail-on is not passed', async () => {
    const result = await runCli([
      'lint',
      'tests/fixtures/simple-openapi.json',
      '--config',
      'tests/fixtures/toolsafe.config.json',
    ]);

    expect(result.exitCode).toBe(1);
  });

  test('CLI --fail-on takes precedence over config lint.failOn', async () => {
    const withConfig = await runCli([
      'lint',
      'tests/fixtures/simple-openapi.json',
      '--config',
      'tests/fixtures/config-failon-warning.json',
    ]);
    expect(withConfig.exitCode).toBe(1);

    const withCliOverride = await runCli([
      'lint',
      'tests/fixtures/simple-openapi.json',
      '--fail-on',
      'error',
      '--config',
      'tests/fixtures/config-failon-warning.json',
    ]);
    expect(withCliOverride.exitCode).toBe(0);
  });

  test('nonexistent --config path produces an error', async () => {
    const result = await runCli([
      'lint',
      'examples/risky-openapi.yaml',
      '--format',
      'json',
      '--config',
      'tests/fixtures/nonexistent-config.json',
    ]);

    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain('Config file not found');
    expect(result.stdout).toBe('');
  });

  test('invalid --config file produces an error', async () => {
    const result = await runCli(['lint', 'examples/risky-openapi.yaml', '--config', 'README.md']);

    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain('ERROR');
    expect(result.stdout).toBe('');
  });
});
