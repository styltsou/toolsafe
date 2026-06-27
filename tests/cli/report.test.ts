import { describe, expect, test } from 'bun:test';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runCli } from '../helpers/cli';

describe('toolsafe report CLI', () => {
  test('prints Markdown to stdout by default', async () => {
    const result = await runCli(['report', 'examples/risky-openapi.yaml']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('# ToolSafe Agent-Readiness Report');
    expect(result.stdout).toContain('## Summary');
    expect(result.stdout).toContain('## Findings');
    expect(result.stderr).toBe('');
  });

  test('prints JSON to stdout when requested', async () => {
    const result = await runCli(['report', 'examples/risky-openapi.yaml', '--format', 'json']);
    const report = JSON.parse(result.stdout);

    expect(result.exitCode).toBe(0);
    expect(report.summary.totalTools).toBe(5);
    expect(report.findings[0].ruleId).toBe('safety/destructive-requires-guard');
    expect(result.stderr).toBe('');
  });

  test('prints SARIF to stdout when requested', async () => {
    const result = await runCli(['report', 'examples/risky-openapi.yaml', '--format', 'sarif']);
    const parsed = JSON.parse(result.stdout);

    expect(result.exitCode).toBe(0);
    expect(parsed.version).toBe('2.1.0');
    expect(parsed.runs[0].tool.driver.name).toBe('ToolSafe');
    expect(parsed.runs[0].results.length).toBeGreaterThan(0);
    expect(result.stderr).toBe('');
  });

  test('writes Markdown to disk when --out is provided', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'toolsafe-report-'));
    const outputPath = join(directory, 'reports', 'toolsafe-report.md');
    const result = await runCli([
      'report',
      'examples/risky-openapi.yaml',
      '--format',
      'markdown',
      '--out',
      outputPath,
    ]);
    const output = await readFile(outputPath, 'utf8');

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe('');
    expect(result.stderr).toBe('');
    expect(output).toContain('# ToolSafe Agent-Readiness Report');
  });

  test('prints HTML to stdout when requested', async () => {
    const result = await runCli(['report', 'examples/risky-openapi.yaml', '--format', 'html']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('<!DOCTYPE html>');
    expect(result.stdout).toContain('ToolSafe Agent-Readiness Report');
    expect(result.stdout).toContain('<h2>Summary</h2>');
    expect(result.stderr).toBe('');
  });

  test('exits 2 for invalid report formats', async () => {
    const result = await runCli(['report', 'examples/risky-openapi.yaml', '--format', 'pdf']);

    expect(result.exitCode).toBe(2);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('Invalid --format value');
  });

  test('exits 2 for input errors', async () => {
    const result = await runCli(['report', 'README.md', '--format', 'json']);

    expect(result.exitCode).toBe(2);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('ToolSafe UNSUPPORTED_FILE_TYPE');
  });
});
