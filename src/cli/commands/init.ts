import { existsSync } from 'node:fs';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname, join, relative, basename } from 'node:path';
import { createInterface } from 'node:readline/promises';
import type { Command } from 'commander';
import { loadConfig } from '@/config/loader';
import type { ToolSafeConfig } from '@/config/types';
import type { AnalysisResult } from '@/core/types';
import { analyzeOpenApi } from '@/core/analyze';
import picocolors from 'picocolors';

const TEMPLATES_DIR = join(import.meta.dir, 'init');
const IGNORE_DIRS = new Set(['node_modules', '.git']);

type InitOptions = {
  analyze?: boolean;
};

async function loadTemplate(...parts: string[]): Promise<string> {
  return readFile(join(TEMPLATES_DIR, ...parts), 'utf8');
}

async function writeFileIfOk(filePath: string, content: string, label: string): Promise<void> {
  if (existsSync(filePath)) {
    if (process.stdin.isTTY) {
      const rl = createInterface({ input: process.stdin, output: process.stdout });

      try {
        const answer = await rl.question(`${label} already exists. Overwrite? (y/N) `);

        if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
          process.stdout.write(`Skipping ${label}\n`);
          return;
        }
      } finally {
        rl.close();
      }
    } else {
      process.stdout.write(`Skipping ${label} (file already exists, non-TTY mode)\n`);
      return;
    }
  }

  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, content, 'utf8');
  process.stdout.write(`Created ${label}\n`);
}

function matchesNamingConvention(relPath: string): boolean {
  const fileName = basename(relPath).toLowerCase();
  const dirs = relPath.toLowerCase().split(/[/\\]/);
  dirs.pop();

  if (
    fileName.includes('openapi') ||
    fileName.includes('swagger') ||
    fileName.startsWith('spec.')
  ) {
    return true;
  }

  if (dirs.some((d) => d === 'openapi' || d === 'swagger')) {
    return true;
  }

  return false;
}

async function sniffOpenApiFile(file: string): Promise<boolean> {
  try {
    const head = await Bun.file(file).slice(0, 4096).text();
    return head.includes('openapi');
  } catch {
    return false;
  }
}

async function discoverOpenApiFiles(root: string): Promise<string[]> {
  const glob = new Bun.Glob('**/*.{yaml,yml,json}');
  const byNaming: string[] = [];
  const candidates: string[] = [];

  for await (const match of glob.scan({ cwd: root })) {
    const absPath = join(root, match);

    if (match === 'toolsafe.config.json' || IGNORE_DIRS.has(match.split(/[/\\]/)[0]!)) {
      continue;
    }

    if (matchesNamingConvention(match)) {
      byNaming.push(absPath);
    } else {
      candidates.push(absPath);
    }
  }

  const sniffed = (
    await Promise.all(candidates.map(async (f) => ((await sniffOpenApiFile(f)) ? f : null)))
  ).filter((f): f is string => f !== null);

  return [...byNaming, ...sniffed].toSorted();
}

function formatFindingCount(result: {
  summary: { totalTools: number; findingCounts: { info: number; warning: number; error: number } };
}): string {
  const parts: string[] = [`${result.summary.totalTools} operations`];

  if (result.summary.findingCounts.error > 0) {
    parts.push(
      `${picocolors.red(`${result.summary.findingCounts.error} error${result.summary.findingCounts.error !== 1 ? 's' : ''}`)}`,
    );
  } else {
    parts.push(`0 errors`);
  }

  if (result.summary.findingCounts.warning > 0) {
    parts.push(
      `${picocolors.yellow(`${result.summary.findingCounts.warning} warning${result.summary.findingCounts.warning !== 1 ? 's' : ''}`)}`,
    );
  } else {
    parts.push(`0 warnings`);
  }

  if (result.summary.findingCounts.info > 0) {
    parts.push(`${picocolors.dim(`${result.summary.findingCounts.info} info`)}`);
  }

  return parts.join(', ');
}

function renderSkipReason(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes('UNSUPPORTED_FILE_TYPE')) return 'unsupported file type';
  if (message.includes('Missing required openapi')) return 'not an OpenAPI spec';
  if (message.includes('OPENAPI_PARSE_ERROR')) return 'invalid OpenAPI spec';
  if (message.includes('OPENAPI_UNSUPPORTED_VERSION')) return 'unsupported OpenAPI version';
  return 'parse error';
}

async function analyzeProject(root: string, config: ToolSafeConfig | undefined): Promise<void> {
  process.stdout.write(`\nAnalyzing project for OpenAPI specs...\n`);

  const files = await discoverOpenApiFiles(root);

  if (files.length === 0) {
    process.stdout.write(`\n  ${picocolors.dim('No OpenAPI files found.')}\n`);
    return;
  }

  const entries = await Promise.all(
    files.map(async (file) => {
      const relPath = relative(root, file);
      try {
        const result = await analyzeOpenApi(file, config);
        process.stdout.write(
          `  ${picocolors.green('✓')} ${relPath}  (${formatFindingCount(result)})\n`,
        );
        return { kind: 'success' as const, file, result };
      } catch (error) {
        const reason = renderSkipReason(error);
        process.stdout.write(`  ${picocolors.dim('-')} ${relPath}  skipped (${reason})\n`);
        return { kind: 'skipped' as const, file, reason };
      }
    }),
  );

  const results = entries.filter(
    (e): e is { kind: 'success'; file: string; result: AnalysisResult } => e.kind === 'success',
  );
  const skipped = entries.filter(
    (e): e is { kind: 'skipped'; file: string; reason: string } => e.kind === 'skipped',
  );

  const totalErrors = results.reduce((sum, r) => sum + r.result.summary.findingCounts.error, 0);
  const totalWarnings = results.reduce((sum, r) => sum + r.result.summary.findingCounts.warning, 0);
  const totalInfos = results.reduce((sum, r) => sum + r.result.summary.findingCounts.info, 0);
  const totalOperations = results.reduce((sum, r) => sum + r.result.summary.totalTools, 0);

  process.stdout.write(
    `\n${picocolors.bold('Summary:')} ${results.length} spec${results.length !== 1 ? 's' : ''} analyzed, ${skipped.length} skipped\n`,
  );
  process.stdout.write(
    `Total: ${totalErrors > 0 ? picocolors.red(String(totalErrors)) : totalErrors} error${totalErrors !== 1 ? 's' : ''}, ${totalWarnings > 0 ? picocolors.yellow(String(totalWarnings)) : totalWarnings} warning${totalWarnings !== 1 ? 's' : ''}, ${picocolors.dim(String(totalInfos))} info${totalInfos !== 1 ? '' : ''} across ${totalOperations} operations\n`,
  );

  if (totalErrors > 0) {
    process.exitCode = 1;
  }
}

export function registerInitCommand(program: Command): void {
  program
    .command('init')
    .description('Bootstrap ToolSafe configuration for a new repo')
    .option('-a, --analyze', 'Discover and lint OpenAPI specs in the project')
    .action(async (options: InitOptions) => {
      const cwd = process.cwd();

      const [configContent, workflowContent] = await Promise.all([
        loadTemplate('toolsafe.config.json'),
        loadTemplate('.github', 'workflows', 'toolsafe.yml'),
      ]);

      await writeFileIfOk(
        resolve(cwd, 'toolsafe.config.json'),
        configContent,
        'toolsafe.config.json',
      );
      await writeFileIfOk(
        resolve(cwd, '.github', 'workflows', 'toolsafe.yml'),
        workflowContent,
        '.github/workflows/toolsafe.yml',
      );

      if (options.analyze) {
        const config = loadConfig();
        await analyzeProject(cwd, config);
      }
    });
}
