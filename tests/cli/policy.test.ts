import { describe, expect, test } from 'bun:test';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { runCli } from '../helpers/cli';

describe('toolsafe policy CLI', () => {
  test('prints advisory YAML to stdout by default', async () => {
    const result = await runCli(['policy', 'examples/risky-openapi.yaml']);
    const policy = parseYaml(result.stdout);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    expect(policy.advisory).toBe(true);
    expect(policy.operations.deleteUser.mode).toBe('require_confirmation');
  });

  test('writes advisory YAML to disk when --out is provided', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'toolsafe-policy-'));
    const outputPath = join(directory, 'policy', 'guard-policy.yaml');
    const result = await runCli(['policy', 'examples/risky-openapi.yaml', '--out', outputPath]);
    const output = await readFile(outputPath, 'utf8');
    const policy = parseYaml(output);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe('');
    expect(result.stderr).toBe('');
    expect(policy.operations.chargePayment.mode).toBe('require_confirmation');
  });

  test('exits 2 for input errors', async () => {
    const result = await runCli(['policy', 'README.md']);

    expect(result.exitCode).toBe(2);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('ToolSafe UNSUPPORTED_FILE_TYPE');
  });
});
