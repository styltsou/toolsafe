import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { mkdtemp, rm, readFile, mkdir, writeFile, cp } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const PROJECT_ROOT = join(import.meta.dir, '../..');

async function runInitInDir(
  cwd: string,
  args: string[] = [],
): Promise<{
  exitCode: number;
  stdout: string;
  stderr: string;
}> {
  const proc = Bun.spawn(
    [process.execPath, 'run', join(PROJECT_ROOT, 'src/cli/index.ts'), 'init', ...args],
    {
      cwd,
      env: {
        ...process.env,
        NO_COLOR: '1',
      },
      stdout: 'pipe',
      stderr: 'pipe',
    },
  );

  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);

  return { exitCode, stdout, stderr };
}

describe('toolsafe init', () => {
  let tmpDir: string;

  beforeAll(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'toolsafe-init-'));
  });

  afterAll(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  test('creates both files in an empty directory', async () => {
    const result = await runInitInDir(tmpDir);

    expect(result.exitCode).toBe(0);

    const configContent = await readFile(join(tmpDir, 'toolsafe.config.json'), 'utf8');
    expect(configContent).toContain('"rules"');
    expect(configContent).toContain('"lint"');
    expect(configContent).toContain('"failOn": "error"');
    expect(configContent).toContain('"format": "markdown"');

    const workflowContent = await readFile(
      join(tmpDir, '.github', 'workflows', 'toolsafe.yml'),
      'utf8',
    );
    expect(workflowContent).toContain('name: ToolSafe');
    expect(workflowContent).toContain('tj-actions/changed-files');
    expect(workflowContent).toContain('--fail-on error');
  });

  test('skips existing files in non-TTY mode', async () => {
    await rm(tmpDir, { recursive: true, force: true });
    await mkdir(join(tmpDir, '.github', 'workflows'), { recursive: true });

    await writeFile(join(tmpDir, 'toolsafe.config.json'), 'original config');
    await writeFile(join(tmpDir, '.github', 'workflows', 'toolsafe.yml'), 'original workflow');

    const result = await runInitInDir(tmpDir);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Skipping');
    expect(result.stdout).toContain('non-TTY');

    const configContent = await readFile(join(tmpDir, 'toolsafe.config.json'), 'utf8');
    expect(configContent).toBe('original config');

    const workflowContent = await readFile(
      join(tmpDir, '.github', 'workflows', 'toolsafe.yml'),
      'utf8',
    );
    expect(workflowContent).toBe('original workflow');
  });

  test('generated config file is valid JSON and contains all rule IDs', async () => {
    await rm(tmpDir, { recursive: true, force: true });
    await mkdir(join(tmpDir, '.github', 'workflows'), { recursive: true });

    const result = await runInitInDir(tmpDir);
    expect(result.exitCode).toBe(0);

    const raw = await readFile(join(tmpDir, 'toolsafe.config.json'), 'utf8');
    const config = JSON.parse(raw);

    expect(config.rules).toBeDefined();
    expect(config.rules['safety/destructive-requires-guard']).toBe('error');
    expect(config.rules['docs/weak-description']).toBe('info');
    expect(config.lint.failOn).toBe('error');
    expect(config.report.format).toBe('markdown');
  });

  test('--analyze discovers and lints OpenAPI specs', async () => {
    await rm(tmpDir, { recursive: true, force: true });
    await mkdir(join(tmpDir, '.github', 'workflows'), { recursive: true });

    await cp(join(PROJECT_ROOT, 'examples/risky-openapi.yaml'), join(tmpDir, 'risky-openapi.yaml'));
    await cp(
      join(PROJECT_ROOT, 'tests/fixtures/simple-openapi.json'),
      join(tmpDir, 'openapi.json'),
    );

    await writeFile(join(tmpDir, 'package.json'), JSON.stringify({ name: 'test' }));
    await writeFile(join(tmpDir, 'tsconfig.json'), JSON.stringify({ compilerOptions: {} }));

    const result = await runInitInDir(tmpDir, ['--analyze']);

    expect(result.exitCode).toBe(1);

    expect(result.stdout).toContain('Created toolsafe.config.json');
    expect(result.stdout).toContain('Created .github/workflows/toolsafe.yml');
    expect(result.stdout).toContain('Analyzing project for OpenAPI specs');
    expect(result.stdout).toContain('risky-openapi.yaml');
    expect(result.stdout).toContain('openapi.json');
    expect(result.stdout).toContain('Summary:');
  });

  test('--analyze exits 0 when no errors are found', async () => {
    await rm(tmpDir, { recursive: true, force: true });
    await mkdir(join(tmpDir, '.github', 'workflows'), { recursive: true });

    await cp(
      join(PROJECT_ROOT, 'tests/fixtures/simple-openapi.json'),
      join(tmpDir, 'openapi.json'),
    );

    const result = await runInitInDir(tmpDir, ['--analyze']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('openapi.json');
    expect(result.stdout).toContain('0 errors');
  });

  test('--analyze with no OpenAPI files prints appropriate message', async () => {
    await rm(tmpDir, { recursive: true, force: true });
    await mkdir(join(tmpDir, '.github', 'workflows'), { recursive: true });

    await writeFile(join(tmpDir, 'random.txt'), 'hello');

    const result = await runInitInDir(tmpDir, ['--analyze']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('No OpenAPI files found');
  });

  test('--analyze discovers files by naming convention (openapi.*)', async () => {
    await rm(tmpDir, { recursive: true, force: true });
    await mkdir(join(tmpDir, '.github', 'workflows'), { recursive: true });

    await cp(
      join(PROJECT_ROOT, 'tests/fixtures/simple-openapi.json'),
      join(tmpDir, 'openapi.json'),
    );

    const result = await runInitInDir(tmpDir, ['--analyze']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('openapi.json');
  });

  test('--analyze discovers files by naming convention (swagger path)', async () => {
    await rm(tmpDir, { recursive: true, force: true });
    await mkdir(join(tmpDir, 'swagger'), { recursive: true });

    await cp(
      join(PROJECT_ROOT, 'tests/fixtures/simple-openapi.json'),
      join(tmpDir, 'swagger', 'v1.json'),
    );

    const result = await runInitInDir(tmpDir, ['--analyze']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('swagger/v1.json');
  });

  test('--analyze discovers files by content sniffing', async () => {
    await rm(tmpDir, { recursive: true, force: true });
    await mkdir(join(tmpDir, '.github', 'workflows'), { recursive: true });

    const yamlContent =
      'openapi: "3.1.0"\ninfo:\n  title: Sniffed API\n  version: "1.0.0"\npaths: {}\n';
    await writeFile(join(tmpDir, 'my-api.yaml'), yamlContent);

    const result = await runInitInDir(tmpDir, ['--analyze']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('my-api.yaml');
  });

  test('--analyze skips non-OpenAPI json files', async () => {
    await rm(tmpDir, { recursive: true, force: true });
    await mkdir(join(tmpDir, '.github', 'workflows'), { recursive: true });

    await writeFile(join(tmpDir, 'package.json'), JSON.stringify({ name: 'test' }));

    const result = await runInitInDir(tmpDir, ['--analyze']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('No OpenAPI files found');
    expect(result.stdout).not.toContain('package.json');
  });
});
