import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { analyzeOpenApi } from '@/core/analyze';
import { generateEvalIdeas, renderEvalIdeasYaml } from '@/generators/evals';
import { generatePolicyDraft, renderPolicyYaml } from '@/generators/policy';
import { renderJsonReport, renderMarkdownReport, renderTerminalReport } from '@/reporters';

const INPUT_FILE = 'examples/risky-openapi.yaml';
const OUTPUT_DIR = 'examples/output';
const FILES: { name: string; generate: () => string | Promise<string> }[] = [];

const result = await analyzeOpenApi(INPUT_FILE);

FILES.push(
  { name: 'lint.txt', generate: () => renderTerminalReport(result) },
  { name: 'toolsafe-report.json', generate: () => renderJsonReport(result) },
  { name: 'TOOLSAFE_REPORT.md', generate: () => renderMarkdownReport(result) },
  { name: 'guard-policy.yaml', generate: () => renderPolicyYaml(generatePolicyDraft(result)) },
  { name: 'toolsafe.evals.yaml', generate: () => renderEvalIdeasYaml(generateEvalIdeas(result)) },
);

const tmpDir = await mkdtemp(join(tmpdir(), 'toolsafe-examples-'));
let hasDiff = false;

const checks = await Promise.all(
  FILES.map(async (file) => {
    const generated = await file.generate();
    const tmpPath = join(tmpDir, file.name);
    await writeFile(tmpPath, generated, 'utf8');

    const committedPath = `${OUTPUT_DIR}/${file.name}`;

    try {
      const committed = await readFile(committedPath, 'utf8');

      if (generated !== committed) {
        console.error(`\n❌ ${file.name} differs from committed example.`);
        console.error(`   Regenerated: ${tmpPath}`);
        console.error(`   Committed:   ${committedPath}`);
        return false;
      }

      console.log(`✅ ${file.name} matches`);
      return true;
    } catch {
      console.error(`\n❌ ${file.name} does not exist at ${committedPath}. Run bun run examples:generate first.`);
      return false;
    }
  }),
);

hasDiff = checks.some((ok) => !ok);

if (hasDiff) {
  console.error('\n❌ Some examples differ. Run `bun run examples:generate` to update committed examples.');
  process.exit(1);
} else {
  console.log('\n✅ All examples are up to date.');
}
