import { describe, expect, test } from 'bun:test';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { runCli } from '../helpers/cli';

describe('toolsafe generate --kind evals', () => {
  test('prints advisory eval YAML to stdout by default', async () => {
    const result = await runCli(['generate', '--kind', 'evals', 'examples/risky-openapi.yaml']);
    const evals = parseYaml(result.stdout);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    expect(evals.advisory).toBe(true);
    expect(evals.cases[0].operationId).toBe('deleteUser');
    expect(evals.cases[0].expectedBehavior).toContain('confirmation');
  });

  test('writes advisory eval YAML to disk when --out is provided', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'toolsafe-evals-'));
    const outputPath = join(directory, 'evals', 'toolsafe.evals.yaml');
    const result = await runCli([
      'generate',
      '--kind',
      'evals',
      'examples/risky-openapi.yaml',
      '--out',
      outputPath,
    ]);
    const output = await readFile(outputPath, 'utf8');
    const evals = parseYaml(output);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe('');
    expect(result.stderr).toBe('');
    expect(
      evals.cases.some(
        (testCase: { type: string }) => testCase.type === 'error_response_is_structured',
      ),
    ).toBe(true);
  });

  test('exits 2 for input errors', async () => {
    const result = await runCli(['generate', '--kind', 'evals', 'README.md']);

    expect(result.exitCode).toBe(2);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('ToolSafe UNSUPPORTED_FILE_TYPE');
  });
});
